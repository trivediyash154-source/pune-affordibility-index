"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { useInView } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { useData } from "@/lib/data/useData";
import { useTheme } from "@/lib/stores/theme.store";
import { useCountUp } from "@/lib/hooks/useCountUp";

const CITATION =
  'Y. Trivedi, "A Seasonally-Dynamic Affordability-Livability Index for Pune Using Real Rental and Air Quality Data," in Proc. IEEE GSCon 2027, Surat, India, Jan. 2027.';

function CountUpNum({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const n = useCountUp(value, 1.4, decimals);
  return <>{n}</>;
}
function KeyNum({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <span ref={ref} className="font-display text-5xl font-semibold text-accent">
      {inView ? <CountUpNum value={value} decimals={decimals} /> : 0}{suffix}
    </span>
  );
}

export default function ResearchPage() {
  const { store, loading, error } = useData();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [seasonalRanks, setSeasonalRanks] = useState<{ locality: string; monsoon: number; winter: number }[]>([]);

  useEffect(() => {
    fetch("/data/index_by_season_long.csv")
      .then((r) => r.text())
      .then((t) => {
        const rows = Papa.parse<Record<string, unknown>>(t, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
        const byLoc: Record<string, { monsoon?: number; winter?: number }> = {};
        rows.forEach((r) => {
          const loc = String(r.locality);
          if (!loc || loc === "undefined") return;
          byLoc[loc] = byLoc[loc] || {};
          if (r.season === "Monsoon") byLoc[loc].monsoon = Number(r.rank);
          if (r.season === "Winter") byLoc[loc].winter = Number(r.rank);
        });
        setSeasonalRanks(
          Object.entries(byLoc)
            .filter(([, v]) => v.monsoon && v.winter)
            .map(([locality, v]) => ({ locality, monsoon: v.monsoon!, winter: v.winter! })),
        );
      })
      .catch(() => setSeasonalRanks([]));
  }, []);

  if (loading) return <div className="p-10 text-text-muted">Loading real data…</div>;
  if (error || !store) return <div className="p-10 text-coral">Failed to load data: {error}</div>;

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#C8C7C2" : "#4A4A4A";

  // station x season AQI
  const stations = Array.from(new Set(store.aqi.map((r) => r.station)));
  const stationData = stations
    .map((st) => {
      const o: Record<string, number | string> = { station: st };
      store.aqi.filter((r) => r.station === st).forEach((r) => (o[r.season] = r.mean_aqi));
      return o;
    })
    .sort((a, b) => (Number(b.Winter) || 0) - (Number(a.Winter) || 0));

  const copy = () => {
    navigator.clipboard?.writeText(CITATION).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const DOWNLOADS: [string, string][] = [
    ["/data/composite_index.csv", "composite_index.csv"],
    ["/data/fuzzy_topsis_results.csv", "fuzzy_topsis_results.csv"],
    ["/data/shap_feature_importance.csv", "shap_feature_importance.csv"],
    ["/data/methodology.md", "methodology.md"],
    ["/figures/figures.zip", "all figures (ZIP)"],
  ];

  const tooltipStyle = { background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold text-text-primary">Research Findings</h1>
      <p className="mt-2 text-text-muted">Key results from the Pune Affordability-Livability Index study.</p>
      <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-4">
        <p className="text-sm leading-relaxed text-text-muted">{CITATION}</p>
        <button onClick={copy} className="mt-3 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover">
          {copied ? "Copied ✓" : "Copy citation"}
        </button>
      </div>

      {/* Result 1 */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">Multi-station seasonal AQI variation</h2>
        <div className="mt-2"><KeyNum value={80.9} decimals={1} suffix=" pts" /></div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Winter AQI across 9 CPCB/MPCB stations ranges from 101.5 (Panchawati-Pashan) to 182.4
          (Bhumkar Nagar) — an 80.9-point spread that static city-wide indices cannot capture.
        </p>
        <div className="card mt-4 rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={stationData} margin={{ bottom: 60 }}>
              <CartesianGrid stroke={gridColor} />
              <XAxis dataKey="station" tick={{ fill: textColor, fontSize: 10 }} angle={-35} textAnchor="end" interval={0} height={70} />
              <YAxis tick={{ fill: textColor, fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: textColor }} />
              <Bar dataKey="Monsoon" fill="#2DD4BF" />
              <Bar dataKey="Summer" fill="#D97706" />
              <Bar dataKey="Winter" fill="#E8614A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Result 2 */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">Seasonal ranking shift</h2>
        <div className="mt-2"><KeyNum value={0.925} decimals={3} /></div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Spearman ρ = 0.925 between Monsoon and Winter rankings. With multi-station AQI, locality
          rankings genuinely shift between seasons — points off the diagonal moved.
        </p>
        <div className="card mt-4 rounded-2xl p-5">
          <ResponsiveContainer width="100%" height={360}>
            <ScatterChart margin={{ left: 10, bottom: 10 }}>
              <CartesianGrid stroke={gridColor} />
              <XAxis type="number" dataKey="monsoon" name="Monsoon rank" domain={[0, 28]} tick={{ fill: textColor, fontSize: 11 }} label={{ value: "Monsoon rank", fill: textColor, position: "insideBottom", offset: -5 }} />
              <YAxis type="number" dataKey="winter" name="Winter rank" domain={[0, 28]} tick={{ fill: textColor, fontSize: 11 }} label={{ value: "Winter rank", fill: textColor, angle: -90, position: "insideLeft" }} />
              <ZAxis range={[60, 60]} />
              <ReferenceLine segment={[{ x: 1, y: 1 }, { x: 27, y: 27 }]} stroke={textColor} strokeDasharray="5 4" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={seasonalRanks} fill="#C17F00" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Result 3 */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">Uncertainty quantification</h2>
        <div className="mt-2"><KeyNum value={70} suffix="%" /></div>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          10,000-run Monte-Carlo Fuzzy TOPSIS reveals ranking confidence. Wagholi holds Rank 1 with
          probability 1.00, but Hinjewadi appears in the top 3 only ~70% of the time under weight
          perturbation — a confidence interval invisible to deterministic ranking.
        </p>
        <div className="card mt-4 grid gap-4 rounded-2xl p-5 md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figures/probabilistic_rankings.png" alt="Rank probability distribution" className="w-full rounded-lg" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figures/deterministic_vs_fuzzy_comparison.png" alt="Deterministic vs fuzzy ranks" className="w-full rounded-lg" />
        </div>
      </section>

      {/* Result 4 */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">What drives rent in Pune</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          SHAP on 928 real listings: single top driver is <strong className="text-text-primary">area</strong>
          {" "}(mean |SHAP| = 0.140); the aggregate <strong className="text-text-primary">location</strong> effect
          (0.228, summed over locality dummies) is larger. Size dominates individually; location collectively wins.
        </p>
        <div className="card mt-4 rounded-2xl p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figures/shap_rent_importance.png" alt="SHAP rent feature importance" className="mx-auto w-full max-w-2xl rounded-lg" />
        </div>
      </section>

      {/* Reproducibility */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">Reproducibility</h2>
        <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-4 font-mono text-sm text-teal">
          <div>seed = 42</div>
          <div>$ .venv/bin/python run_pipeline.py</div>
          <div className="text-text-subtle"># 9 stations: Katraj, Hadapsar, Bhumkar Nagar, Panchawati-Pashan,</div>
          <div className="text-text-subtle"># Alandi, Bhosari, Nigdi, Karve Road, Dhankawadi</div>
          <div className="text-text-subtle"># 1,779 Pune rentals (MagicBricks 2024-25)</div>
          <div className="text-text-subtle"># validation: TOPSIS ρ=0.967, 10,000-run Monte Carlo</div>
        </div>
      </section>

      {/* Downloads */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-text-primary">Download data</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {DOWNLOADS.map(([href, label]) => (
            <a key={href} href={href} download className="rounded-full border border-border px-4 py-2 text-sm text-text-muted transition hover:border-accent hover:text-text-primary">
              ↓ {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
