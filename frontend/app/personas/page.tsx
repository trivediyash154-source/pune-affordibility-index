"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { useData } from "@/lib/data/useData";
import { dimScore, getIndexData, getPersonaTopN } from "@/lib/data";
import {
  DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
  Dimension,
  PERSONAS,
  PERSONA_KEYS,
  Persona,
} from "@/lib/data/personas";
import { getTradeOffSummary } from "@/lib/data/trade-off-rules";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { BudgetPie } from "@/components/personas/BudgetPie";
import { WeightSliders } from "@/components/personas/WeightSliders";

const DIM_GENERIC: Record<Dimension, string> = {
  rent: "Monthly rent — usually the largest expense.",
  col: "Everyday costs: food, utilities, transport.",
  commute: "Time and cost to reach the work hubs.",
  aqi: "Seasonal air quality and its health impact.",
  safety: "Police-station proximity (proxy for safety).",
  lifestyle: "Cafés, parks, schools, hospitals, transit.",
};
const REASONS: Partial<Record<Persona, Partial<Record<Dimension, string>>>> = {
  student_fresher: {
    rent: "Rent at 45% — freshers have tight budgets and rent dominates spend.",
    safety: "Safety matters when living alone for the first time.",
  },
  junior_it: {
    commute: "Commute at 25% — daily travel to Hinjewadi/Kharadi shapes the day.",
    aqi: "Air quality weighted for long-term health.",
  },
  senior_it: {
    lifestyle: "Lifestyle at 30% — amenities and ambience matter at higher income.",
    safety: "Safety for family and assets.",
  },
  family_kids: {
    lifestyle: "Lifestyle at 30% — schools and parks are essential for kids.",
    safety: "Safety at 25% — the top priority with children.",
  },
  remote_worker: {
    aqi: "Air quality at 30% — home all day means air matters most.",
    lifestyle: "Cafés and ambience for work-from-home variety.",
  },
};
const reasonFor = (p: Persona, d: Dimension) => REASONS[p]?.[d] ?? DIM_GENERIC[d];

function Score({ value }: { value: number }) {
  const n = useCountUp(value, 1.0, 1);
  return <span className="font-display text-5xl font-semibold text-accent">{n}</span>;
}

// weight bar — sits on a theme surface chip, track adapts to theme
function MiniBar({ weights }: { weights: Record<Dimension, number> }) {
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      {DIMENSIONS.map((d) => (
        <div key={d} style={{ width: `${weights[d] * 100}%`, background: DIMENSION_COLORS[d] }} />
      ))}
    </div>
  );
}

export default function PersonasPage() {
  const { store, loading, error } = useData();
  const [persona, setPersona] = useState<Persona>("student_fresher");

  if (loading) return <div className="p-10 text-text-muted">Loading real data…</div>;
  if (error || !store) return <div className="p-10 text-coral">Failed to load data: {error}</div>;

  const meta = PERSONAS[persona];
  const monsoon = getPersonaTopN(store, persona, "Monsoon", 5);
  const winter = getPersonaTopN(store, persona, "Winter", 5);
  const winterRank: Record<string, number> = Object.fromEntries(
    getIndexData(store, "Winter", persona).map((r) => [r.locality, r.rank]),
  );
  const top = monsoon[0];

  const topDim = DIMENSIONS.reduce((a, b) => (meta.weights[b] > meta.weights[a] ? b : a));
  const monsoonAll = getIndexData(store, "Monsoon", persona);
  const topDimSet = [...monsoonAll]
    .sort((a, b) => dimScore(b, topDim) - dimScore(a, topDim))
    .slice(0, 3)
    .map((r) => r.locality);
  const gems = monsoonAll.filter((r) => r.rank >= 6 && r.rank <= 10 && topDimSet.includes(r.locality));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-text-primary">Persona Deep Dive</h1>
      <p className="mt-1 text-sm text-text-muted">Pick a renter profile — everything below updates to fit it.</p>

      {/* hero cards (decorative gradient body; data on theme chips) */}
      <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
        {PERSONA_KEYS.map((p) => {
          const m = PERSONAS[p];
          const pills = getPersonaTopN(store, p, "Monsoon", 3).map((r) => r.locality);
          const active = p === persona;
          return (
            <motion.button
              key={p}
              onClick={() => setPersona(p)}
              animate={{ scale: active ? 1.03 : 1 }}
              className={`min-w-[280px] rounded-2xl bg-gradient-to-br ${m.gradient} p-5 text-left ${
                active ? "ring-2 ring-accent" : "ring-1 ring-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl">{m.icon}</span>
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-primary">
                  ₹{m.income.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-3 font-display text-lg font-semibold text-white">{m.label}</div>
              <div className="mt-2 text-[11px] uppercase tracking-wide text-white/60">Best for</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {pills.map((loc) => (
                  <span
                    key={loc}
                    className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-primary"
                  >
                    {loc}
                  </span>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-border bg-surface p-2">
                <MiniBar weights={m.weights} />
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={persona}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="mt-8 grid gap-6 lg:grid-cols-[3fr_2fr]"
        >
          {/* LEFT */}
          <div className="space-y-6">
            <section className="card rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-text-primary">What matters most</h2>
              <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg">
                {DIMENSIONS.map((d) => (
                  <div
                    key={d}
                    title={reasonFor(persona, d)}
                    style={{ width: `${meta.weights[d] * 100}%`, background: DIMENSION_COLORS[d] }}
                    className="flex items-center justify-center text-[10px] font-medium text-black/70"
                  >
                    {meta.weights[d] >= 0.12 ? `${Math.round(meta.weights[d] * 100)}%` : ""}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                {DIMENSIONS.map((d) => (
                  <div key={d} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: DIMENSION_COLORS[d] }} />
                    <span className="text-text-muted">{DIMENSION_LABELS[d]}</span>
                    <span className="ml-auto text-text-primary">{Math.round(meta.weights[d] * 100)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-text-primary">Your budget breakdown</h2>
              <p className="mb-2 text-xs text-text-muted">On ₹{meta.income.toLocaleString("en-IN")}/month income.</p>
              <BudgetPie income={meta.income} />
            </section>

            {top && (
              <section className="card rounded-2xl border-accent p-6 shadow-glow">
                <div className="text-xs uppercase tracking-wide text-text-muted">Top locality for you (Monsoon)</div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="font-display text-2xl font-semibold text-text-primary">{top.locality}</div>
                    <div className="text-sm text-text-muted">{top.verdict}</div>
                  </div>
                  <Score value={top.composite_index} />
                </div>
                <ul className="mt-3 space-y-1 text-sm text-text-muted">
                  {getTradeOffSummary(top, "Monsoon").slice(0, 3).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                <Link href="/explorer" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
                  View full ranking →
                </Link>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <section className="card rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-text-primary">Seasonal comparison</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "🌧️ Monsoon", rows: monsoon, showMove: false },
                  { label: "🌫️ Winter", rows: winter, showMove: true },
                ].map((col) => (
                  <div key={col.label}>
                    <div className="mb-2 text-xs font-medium text-text-muted">{col.label}</div>
                    <div className="space-y-1.5">
                      {col.rows.map((r) => {
                        const move = col.showMove ? winterRank[r.locality] : r.rank;
                        const delta = col.showMove ? r.rank - move : 0;
                        return (
                          <div key={r.locality} className="flex items-center justify-between rounded-lg bg-surface-sunken px-2.5 py-1.5 text-xs">
                            <span className="truncate text-text-primary">{r.locality}</span>
                            <span className="ml-2 flex items-center gap-1 text-text-muted">
                              {r.composite_index}
                              {col.showMove && (
                                <span className={delta > 0 ? "text-teal" : delta < 0 ? "text-coral" : "text-text-subtle"}>
                                  {delta > 0 ? "↑" : delta < 0 ? "↓" : "–"}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-text-subtle">
                With one AQI station, rank order is the same — scores differ by AQI weight ×
                (114.5−50.5)/100.
              </p>
            </section>

            <section className="card rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold text-text-primary">Hidden gems</h2>
              <p className="mb-3 text-xs text-text-muted">
                Ranked 6–10 overall, but top-3 on this persona&apos;s heaviest dimension
                ({DIMENSION_LABELS[topDim]}).
              </p>
              {gems.length ? (
                <div className="space-y-2">
                  {gems.map((r) => (
                    <div key={r.locality} className="flex items-center gap-3 rounded-xl bg-surface-sunken px-3 py-2">
                      <span className="text-lg font-semibold text-text-muted">#{r.rank}</span>
                      <span className="flex-1 font-medium text-text-primary">{r.locality}</span>
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">Hidden gem 💎</span>
                      <span className="text-[11px] text-text-muted">Excels at {DIMENSION_LABELS[topDim]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-subtle">No hidden gems for this persona — the top dimension aligns with the overall ranking.</p>
              )}
            </section>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* sliders */}
      <section className="card mt-8 rounded-2xl p-6">
        <h2 className="font-display text-2xl font-semibold text-text-primary">What if your priorities changed?</h2>
        <p className="mb-5 mt-1 text-sm text-text-muted">Drag any weight — the rest rebalance to 100%, and the ranking updates live.</p>
        <WeightSliders store={store} season="Winter" defaults={meta.weights} personaLabel={meta.label} />
      </section>
    </div>
  );
}
