"use client";

import { useState } from "react";
import { useData } from "@/lib/data/useData";

const SOURCES: [string, string, string, "Real" | "Proxy", string][] = [
  ["Rent", "MagicBricks (1,779 Pune listings)", "Real", "Real", "Cross-sectional snapshot; no time-series."],
  ["Cost of living", "Numbeo Pune", "Proxy", "Proxy", "City-level only; no per-locality variation."],
  ["Commute", "OSRM + OSM road graph", "Real", "Real", "Off-peak free-flow; no congestion model."],
  ["Air quality", "CPCB Katraj MPCB station", "Real", "Real", "Single station (south Pune); applied as proxy elsewhere."],
  ["Safety", "OSM police-station count", "Proxy", "Proxy", "Police presence ≠ actual safety."],
  ["Lifestyle", "OSM amenities (osmnx)", "Real", "Real", "OSM completeness varies by area."],
];

const LIMITATIONS: [string, string][] = [
  ["Single AQI station", "All localities use the Katraj (south Pune) feed, so seasonal AQI does not vary spatially — ranks don't reorder by season. Adding stations activates spatial variation with no code change."],
  ["Static rent snapshot", "Rents are a 2024–25 MagicBricks snapshot with no dates, so the rent dimension is not seasonal."],
  ["Safety is a proxy", "No open locality-level crime data exists for Pune; police-station density is a weak, possibly inverted proxy, and is sensitivity-tested."],
  ["COL is city-level", "Numbeo gives one Pune figure, disclosed as a constant rather than fabricating per-locality variation."],
  ["OSM completeness", "Amenity counts depend on crowdsourced OSM coverage, which is denser in central areas; snapshot date is recorded."],
];

const SEASONS = [
  { e: "🌧️", n: "Monsoon", a: "50.5", c: "Satisfactory", col: "text-teal" },
  { e: "☀️", n: "Summer", a: "88.3", c: "Satisfactory", col: "text-accent" },
  { e: "🌫️", n: "Winter", a: "114.5", c: "Moderate", col: "text-coral" },
];

const CITATION =
  'Y. Trivedi, "A Seasonally-Dynamic Affordability-Livability Index for Pune Using Real Rental and Air Quality Data," in Proc. IEEE GSCon 2027, Surat, India, Jan. 2027.';

function Accordion({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen((o) => !o)} className="card glass-hover w-full rounded-xl p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text-primary">{title}</span>
        <span className="text-accent">{open ? "−" : "+"}</span>
      </div>
      {open && <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>}
    </button>
  );
}

export default function MethodologyPage() {
  const { store } = useData();
  const [copied, setCopied] = useState(false);

  const stability = (loc: string): number => {
    const row = store?.sensitivity.find((r) => r.locality === loc);
    return row ? Math.round(row.p_top3 * 100) : 0;
  };

  const copy = () => {
    navigator.clipboard?.writeText(CITATION).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold text-text-primary">Research Methodology</h1>
      <p className="mt-2 text-text-muted">
        A transparent, reproducible affordability–livability index for 27 Pune localities — every
        number traced to a real, licensed source.
      </p>

      {/* data sources */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Data sources</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-subtle">
            <tr>
              <th className="px-4 py-2">Dimension</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Caveat</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s[0]} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium text-text-primary">{s[0]}</td>
                <td className="px-4 py-2.5 text-text-muted">{s[1]}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      s[3] === "Real" ? "bg-teal-soft text-teal" : "bg-amber-soft text-amber"
                    }`}
                  >
                    {s[3]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-text-subtle">{s[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-subtle">
        Proxy dimensions are documented in the paper&apos;s limitations section per IEEE review guidelines.
      </p>

      {/* normalization */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Normalization</h2>
      <div className="mt-4 space-y-2 rounded-xl border border-border bg-surface-sunken p-4 font-mono text-sm text-text-primary">
        <div>cost&nbsp;&nbsp;&nbsp;&nbsp;score = 100 − [(value − min) / (max − min) × 100]</div>
        <div>benefit&nbsp;score = [(value − min) / (max − min) × 100]</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        We use min-max (not z-score) so every dimension is a bounded, interpretable 0–100 scale where
        higher always means better; cost dimensions (rent, COL, commute, AQI) are inverted. Z-score
        would allow negatives and obscure the &ldquo;higher = better&rdquo; reading.
      </p>

      {/* seasonal */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Seasonal design</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {SEASONS.map((s) => (
          <div key={s.n} className="card rounded-xl p-4 text-center">
            <div className="text-2xl">{s.e}</div>
            <div className="mt-1 font-medium text-text-primary">{s.n}</div>
            <div className={`mt-1 font-display text-2xl font-semibold ${s.col}`}>{s.a}</div>
            <div className="text-xs text-text-muted">{s.c}</div>
          </div>
        ))}
      </div>
      <blockquote className="mt-4 border-l-2 border-accent pl-4 text-sm italic leading-relaxed text-text-muted">
        Existing affordability indices treat livability as static. We show AQI varies 2.3× between
        seasons in Pune — making static indices misleading for users who weight environmental quality.
      </blockquote>

      {/* limitations */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Limitations</h2>
      <div className="mt-4 space-y-2">
        {LIMITATIONS.map(([t, b]) => (
          <Accordion key={t} title={t} body={b} />
        ))}
      </div>

      {/* validation */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Validation</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-text-subtle">TOPSIS vs composite</div>
          <div className="mt-1 font-display text-3xl font-semibold text-accent">ρ = 0.967</div>
          <div className="text-sm text-text-muted">Methods agree — robust to MCDM choice.</div>
        </div>
        <div className="card rounded-xl p-5">
          <div className="text-xs uppercase tracking-wide text-text-subtle">Monte-Carlo top-3 stability (10,000 runs)</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {["Hinjewadi", "Wagholi", "Wadgaon Sheri"].map((loc) => (
              <span key={loc} className="rounded-full bg-accent-soft px-3 py-1 text-accent">
                {loc} {stability(loc)}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* reproducibility */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Reproducibility</h2>
      <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-4 font-mono text-sm text-teal">
        <div>seed = 42</div>
        <div>$ .venv/bin/python run_pipeline.py</div>
        <div className="text-text-subtle"># data: MagicBricks + CPCB + OSM · built June 2026</div>
      </div>

      {/* citation */}
      <h2 className="mt-12 font-display text-2xl font-semibold text-text-primary">Citation</h2>
      <div className="mt-4 rounded-xl border border-border bg-surface-sunken p-4">
        <p className="text-sm leading-relaxed text-text-muted">{CITATION}</p>
        <button
          onClick={copy}
          className="mt-3 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-fg transition hover:bg-accent-hover"
        >
          {copied ? "Copied ✓" : "Copy citation"}
        </button>
      </div>
    </div>
  );
}
