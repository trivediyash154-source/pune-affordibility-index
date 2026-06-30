"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useData } from "@/lib/data/useData";
import { useTheme } from "@/lib/stores/theme.store";
import {
  IndexRow, RentRow, SEASONS, dimScore, getAmenities, getCommute,
  getIndexData, getLocalityAQI, getLocalityDetail, getRent, recomputeWithWeights,
} from "@/lib/data";
import {
  DIMENSIONS, DIMENSION_LABELS, Dimension, PERSONAS, Persona,
} from "@/lib/data/personas";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { LocalityDrawer } from "@/components/explorer/LocalityDrawer";
import {
  CustomProfile, DEFAULT_PROFILE, DEFAULT_WEIGHTS_PCT, loadProfile, saveProfile,
} from "@/lib/stores/customProfile.store";

// chart colors per spec: rent=coral, col=amber, commute=blue, aqi=teal, safety=green, lifestyle=purple
const CHART_COLORS: Record<Dimension, string> = {
  rent: "#E8614A", col: "#D97706", commute: "#3B82F6", aqi: "#2DD4BF", safety: "#22C55E", lifestyle: "#C084FC",
};
const PRESETS: { label: string; persona: Persona | null }[] = [
  { label: "Like a fresh grad", persona: "student_fresher" },
  { label: "Like a remote worker", persona: "remote_worker" },
  { label: "Like a family", persona: "family_kids" },
  { label: "Custom", persona: null },
];
const BHKS = [1, 2, 3] as const;
const LIFESTYLES = ["Single", "Couple", "Family with kids", "Shared with friends"];
const WORK_MODES = ["Office daily", "Hybrid", "Remote"];
const HUBS = ["Hinjewadi", "Kharadi", "Shivaji Nagar", "Other"];
const HORIZONS = ["< 1 year", "1-3 years", "3-5 years", "5+ years"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active ? "bg-accent text-accent-fg" : "border border-border text-text-muted hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function ScoreNum({ value }: { value: number }) {
  const n = useCountUp(value, 1.0, 1);
  return <span className="font-display text-4xl font-semibold text-accent">{n}</span>;
}

const verdictClass = (v: string) =>
  v === "Excellent" ? "verdict-excellent" : v === "Good" ? "verdict-good" : v === "Average" ? "verdict-average" : "verdict-below";

export default function CustomPage() {
  const { store, loading, error } = useData();
  const { theme } = useTheme();

  const [p, setP] = useState<CustomProfile>(DEFAULT_PROFILE);
  const [returning, setReturning] = useState<CustomProfile | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [drawerLoc, setDrawerLoc] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setReturning(saved);
  }, []);

  if (loading) return <div className="p-10 text-text-muted">Loading real data…</div>;
  if (error || !store) return <div className="p-10 text-coral">Failed to load data: {error}</div>;

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#C8C7C2" : "#4A4A4A";
  const budget = Math.round(p.income * 0.3);

  const setWeight = (dim: Dimension, val: number) => {
    const others = DIMENSIONS.filter((d) => d !== dim);
    const restOld = others.reduce((s, d) => s + p.weights[d], 0);
    const remaining = 100 - val;
    const next = { ...p.weights, [dim]: val } as Record<Dimension, number>;
    if (restOld <= 0) others.forEach((d) => (next[d] = remaining / others.length));
    else others.forEach((d) => (next[d] = (p.weights[d] / restOld) * remaining));
    setP({ ...p, weights: next });
  };
  const applyPreset = (persona: Persona | null) => {
    if (!persona) { setP({ ...p, weights: { ...DEFAULT_WEIGHTS_PCT } }); return; }
    const w = PERSONAS[persona].weights;
    setP({ ...p, weights: Object.fromEntries(DIMENSIONS.map((d) => [d, Math.round(w[d] * 100)])) as Record<Dimension, number> });
  };

  const rentAtBHK = (loc: string): number => {
    const r = getRent(store, loc) as RentRow | undefined;
    if (!r) return 0;
    const v = (r as unknown as Record<string, number>)[`median_rent_${p.bhk}`];
    return Number.isFinite(v) && v > 0 ? v : r.median_rent;
  };

  // ranking under custom weights (fractions)
  const fracW = Object.fromEntries(DIMENSIONS.map((d) => [d, p.weights[d] / 100])) as Record<Dimension, number>;
  const ranking = recomputeWithWeights(store, p.season, fracW);
  const top3 = ranking.slice(0, 3);
  const top10 = ranking.slice(0, 10);
  const cohort = getIndexData(store, p.season, "student_fresher"); // scores persona-independent
  const sqftVals = store.rent.map((r) => r.median_rent_per_sqft).filter((v) => v > 0).sort((a, b) => a - b);
  const puneMedianPerSqft = sqftVals.length ? sqftVals[Math.floor(sqftVals.length / 2)] : 0;

  const detail = (loc: string): IndexRow | undefined => getLocalityDetail(store, loc, p.season, "student_fresher");

  // "why this one for you" — one bullet per the user's top-3 weighted dimensions
  const whyBullets = (loc: string): string[] => {
    const d = detail(loc);
    if (!d) return [];
    const topDims = [...DIMENSIONS].sort((a, b) => p.weights[b] - p.weights[a]).slice(0, 3);
    const amen = getAmenities(store, loc);
    const com = getCommute(store, loc);
    const aqi = getLocalityAQI(store, loc, p.season);
    const rent = rentAtBHK(loc);
    const aqiScores = cohort.map((r) => dimScore(r, "aqi"));
    const pctCleaner = Math.round((aqiScores.filter((v) => v <= dimScore(d, "aqi")).length / aqiScores.length) * 100);
    const out: string[] = [];
    for (const dim of topDims) {
      if (dim === "rent") out.push(`Rent ₹${rent.toLocaleString("en-IN")} is ${Math.round((rent / p.income) * 100)}% of your ₹${p.income.toLocaleString("en-IN")} income`);
      else if (dim === "commute") out.push(com ? `~${com.commute_min} min to ${com.nearest_hub}${com.nearest_hub === p.workHub ? " (your hub)" : ""}` : "Commute data available in breakdown");
      else if (dim === "aqi") out.push(`Cleaner air than ${pctCleaner}% of Pune in ${p.season} (AQI ${aqi?.aqi ?? "—"})`);
      else if (dim === "safety") out.push(`Safety score ${dimScore(d, "safety").toFixed(0)}/100 (police proximity proxy)`);
      else if (dim === "lifestyle") out.push(amen ? `Amenities: ${amen.cafes} cafés, ${amen.parks} parks within 2km` : "Rich amenities nearby");
      else out.push(`Cost-of-living impact (city-level baseline)`);
    }
    return out;
  };

  const burdenColor = (pct: number) => (pct <= 30 ? "text-teal" : pct <= 45 ? "text-amber" : "text-coral");

  // chart data
  const barData = top10.slice(0, 5).map((row) => {
    const d = detail(row.locality)!;
    const obj: Record<string, number | string> = { locality: row.locality };
    DIMENSIONS.forEach((dim) => (obj[dim] = +(fracW[dim] * dimScore(d, dim)).toFixed(1)));
    obj._rent = rentAtBHK(row.locality);
    obj._commute = getCommute(store, row.locality)?.commute_min ?? 0;
    obj._aqi = getLocalityAQI(store, row.locality, p.season)?.aqi ?? 0;
    return obj;
  });
  const lineData = top10.map((row) => ({ locality: row.locality, rent: rentAtBHK(row.locality), affordable: rentAtBHK(row.locality) <= budget }));

  const seeMatches = () => {
    saveProfile(p);
    setShowResults(true);
    setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const weightTotal = Math.round(DIMENSIONS.reduce((s, d) => s + p.weights[d], 0));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl font-semibold text-text-primary">Build your profile</h1>
      <p className="mt-2 text-text-muted">Override every assumption — income, living situation, priorities — and see your personal top localities.</p>

      {returning && !showResults && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-surface-sunken p-4 text-sm">
          <span className="text-text-muted">
            Welcome back. Last profile: ₹{returning.income.toLocaleString("en-IN")} income, {returning.bhk} BHK.
          </span>
          <span className="flex gap-2">
            <button onClick={() => { setP(returning); setReturning(null); }} className="btn-primary text-xs">Use these</button>
            <button onClick={() => setReturning(null)} className="btn-ghost text-xs">Start fresh</button>
          </span>
        </div>
      )}

      {/* Section 1 */}
      <section className="card mt-6 rounded-2xl p-6">
        <h2 className="font-display text-xl font-semibold text-text-primary">Tell us about you</h2>

        <label className="mt-4 block text-sm text-text-muted">Monthly take-home income (₹)</label>
        <div className="mt-2 flex items-center gap-4">
          <input
            type="number" min={10000} max={300000} step={5000} value={p.income}
            onChange={(e) => setP({ ...p, income: Math.max(10000, Math.min(300000, Number(e.target.value) || 0)) })}
            className="w-36 rounded-lg border border-border bg-surface px-3 py-2 text-text-primary"
          />
          <input
            type="range" min={10000} max={300000} step={5000} value={p.income}
            onChange={(e) => setP({ ...p, income: Number(e.target.value) })}
            className="flex-1 accent-[var(--accent)]"
          />
        </div>
        <p className="mt-2 text-sm text-text-muted">
          Recommended rent budget at 30%: <span className="font-semibold text-accent">₹{budget.toLocaleString("en-IN")}/month</span>
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-sm text-text-muted">Bedrooms</div>
            <div className="flex gap-2">{BHKS.map((b) => <Chip key={b} active={p.bhk === b} onClick={() => setP({ ...p, bhk: b })}>{b} BHK</Chip>)}</div>
          </div>
          <div>
            <div className="mb-1.5 text-sm text-text-muted">Work mode</div>
            <div className="flex flex-wrap gap-2">{WORK_MODES.map((m) => <Chip key={m} active={p.workMode === m} onClick={() => setP({ ...p, workMode: m })}>{m}</Chip>)}</div>
          </div>
          <div>
            <div className="mb-1.5 text-sm text-text-muted">Lifestyle</div>
            <div className="flex flex-wrap gap-2">{LIFESTYLES.map((l) => <Chip key={l} active={p.lifestyle === l} onClick={() => setP({ ...p, lifestyle: l })}>{l}</Chip>)}</div>
          </div>
          {p.workMode !== "Remote" && (
            <div>
              <div className="mb-1.5 text-sm text-text-muted">Work location</div>
              <select value={p.workHub} onChange={(e) => setP({ ...p, workHub: e.target.value })}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary">
                {HUBS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="mb-1.5 text-sm text-text-muted">Planning to stay</div>
            <div className="flex flex-wrap gap-2">{HORIZONS.map((h) => <Chip key={h} active={p.horizon === h} onClick={() => setP({ ...p, horizon: h })}>{h}</Chip>)}</div>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section className="card mt-6 rounded-2xl p-6">
        <h2 className="font-display text-xl font-semibold text-text-primary">What matters most to you</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((pr) => <Chip key={pr.label} active={false} onClick={() => applyPreset(pr.persona)}>{pr.label}</Chip>)}
        </div>
        <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg">
          {DIMENSIONS.map((d) => (
            <div key={d} style={{ width: `${p.weights[d]}%`, background: CHART_COLORS[d] }}
              className="flex items-center justify-center text-[10px] font-medium text-black/70">
              {p.weights[d] >= 10 ? `${Math.round(p.weights[d])}%` : ""}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {DIMENSIONS.map((d) => (
            <div key={d}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-text-muted">{DIMENSION_LABELS[d]}</span>
                <span className="font-semibold text-text-primary">{Math.round(p.weights[d])}%</span>
              </div>
              <input type="range" min={0} max={100} step={1} value={p.weights[d]}
                onChange={(e) => setWeight(d, Number(e.target.value))}
                className="w-full" style={{ accentColor: CHART_COLORS[d] }} />
            </div>
          ))}
        </div>
        <div className="mt-2 text-right text-xs text-text-subtle">Total: {weightTotal}%</div>
      </section>

      {/* Section 3 */}
      <section className="card mt-6 rounded-2xl p-6">
        <h2 className="font-display text-xl font-semibold text-text-primary">Season</h2>
        <div className="mt-3 flex gap-2">
          {SEASONS.map((s) => <Chip key={s} active={p.season === s} onClick={() => setP({ ...p, season: s })}>{s}</Chip>)}
        </div>
      </section>

      {/* Section 4 */}
      <button onClick={seeMatches} className="btn-primary mt-6 w-full text-base">See my matches →</button>

      {/* Section 5 */}
      {showResults && (
        <motion.div id="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-10 space-y-8">
          <h2 className="font-display text-2xl font-semibold text-text-primary">Your matches — {p.season}, {p.bhk} BHK</h2>

          {/* 5a top 3 cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {top3.map((row, i) => {
              const d = detail(row.locality)!;
              const rent = rentAtBHK(row.locality);
              const pct = Math.round((rent / p.income) * 100);
              return (
                <div key={row.locality} className="card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-semibold text-accent">#{i + 1}</span>
                    <span className={`text-xs font-medium ${verdictClass(d.verdict)}`}>{d.verdict}</span>
                  </div>
                  <div className="mt-2 font-display text-2xl font-semibold text-text-primary">{row.locality}</div>
                  <ScoreNum value={row.index} />
                  <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                    {whyBullets(row.locality).map((b, j) => <li key={j}>• {b}</li>)}
                  </ul>
                  <div className={`mt-3 text-sm font-medium ${burdenColor(pct)}`}>
                    ₹{rent.toLocaleString("en-IN")} rent = {pct}% of income
                  </div>
                  <button onClick={() => setDrawerLoc(row.locality)} className="mt-2 text-xs font-semibold text-accent hover:underline">
                    View full breakdown →
                  </button>
                </div>
              );
            })}
          </div>

          {/* 5b stacked contributions */}
          <div className="card rounded-2xl p-5">
            <div className="mb-2 text-sm text-text-muted">Score composition — top 5 (dimension contributions)</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData}>
                <CartesianGrid stroke={gridColor} />
                <XAxis dataKey="locality" tick={{ fill: textColor, fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }}
                  formatter={(v, name) => [`${v} pts`, DIMENSION_LABELS[String(name) as Dimension] ?? String(name)]}
                />
                <Legend wrapperStyle={{ color: textColor, fontSize: 11 }} formatter={(v) => DIMENSION_LABELS[String(v) as Dimension] ?? String(v)} />
                {DIMENSIONS.map((d) => <Bar key={d} dataKey={d} stackId="a" fill={CHART_COLORS[d]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 5c affordability */}
          <div className="card rounded-2xl p-5">
            <div className="mb-2 text-sm text-text-muted">Rent affordability — {p.bhk} BHK median vs your budget (₹{budget.toLocaleString("en-IN")})</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid stroke={gridColor} />
                <XAxis dataKey="locality" tick={{ fill: textColor, fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={{ fill: textColor, fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }}
                  formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "median rent"]} />
                <ReferenceLine y={budget} stroke="#C17F00" strokeDasharray="6 4" label={{ value: "your budget", fill: textColor, fontSize: 11, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="rent" stroke="#3B82F6" strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: { affordable: boolean }; index: number };
                    return <circle key={index} cx={cx} cy={cy} r={5} fill={payload.affordable ? "#22C55E" : "#E8614A"} stroke="white" strokeWidth={1} />;
                  }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-1 text-xs text-text-subtle">Green dot = within budget · red = stretched.</p>
          </div>

          {/* 5d investment outlook (honest) */}
          <div className="card rounded-2xl p-5">
            <div className="text-sm font-medium text-text-primary">Rent trend indicators (2024–2025 cross-section)</div>
            <p className="mt-1 text-xs italic text-text-subtle">
              Based on a cross-sectional 2024–2025 listing snapshot. Not a forecast. Forward projections require time-series data we do not yet have.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {top3.map((row) => {
                const r = getRent(store, row.locality) as RentRow | undefined;
                const persqft = r?.median_rent_per_sqft ?? 0;
                const rel = puneMedianPerSqft ? Math.round(((persqft - puneMedianPerSqft) / puneMedianPerSqft) * 100) : 0;
                return (
                  <div key={row.locality} className="rounded-xl bg-surface-sunken p-3 text-sm">
                    <div className="font-medium text-text-primary">{row.locality}</div>
                    <div className="text-text-muted">₹{persqft}/sqft · n={r?.n_listings ?? "—"}</div>
                    <div className={rel > 0 ? "text-coral" : "text-teal"}>{rel > 0 ? "+" : ""}{rel}% vs Pune median</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5e */}
          <Link href="/explorer" className="inline-block text-sm font-semibold text-accent hover:underline">
            Want to see all 27? Open the full ranking →
          </Link>
        </motion.div>
      )}

      <LocalityDrawer store={store} locality={drawerLoc} season={p.season} persona={"student_fresher" as Persona} onClose={() => setDrawerLoc(null)} />
    </div>
  );
}
