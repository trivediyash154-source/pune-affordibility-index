"use client";

import { useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as ReRadar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { useData } from "@/lib/data/useData";
import { useTheme } from "@/lib/stores/theme.store";
import {
  Season,
  SEASONS,
  dimScore,
  getIndexData,
  getLocalityDetail,
} from "@/lib/data";
import {
  DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
  PERSONAS,
  PERSONA_KEYS,
  Persona,
} from "@/lib/data/personas";
import { getZone } from "@/lib/data/zones";
import { getTradeOffSummary } from "@/lib/data/trade-off-rules";
import { useCountUp } from "@/lib/hooks/useCountUp";

const SERIES_COLORS = ["#F0A500", "#2DD4BF", "#E8614A"];

const verdictClass = (v: string) =>
  v === "Excellent" ? "verdict-excellent" : v === "Good" ? "verdict-good" : v === "Average" ? "verdict-average" : "verdict-below";

function ScoreNum({ value }: { value: number }) {
  const n = useCountUp(value, 1.0, 1);
  return <span className="font-display text-4xl font-semibold text-accent">{n}</span>;
}

export default function ComparePage() {
  const { store, loading, error } = useData();
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string[]>(["Hinjewadi", "Wagholi"]);
  const [season, setSeason] = useState<Season>("Winter");
  const [persona, setPersona] = useState<Persona>("student_fresher");

  if (loading) return <div className="p-10 text-text-muted">Loading real data…</div>;
  if (error || !store) return <div className="p-10 text-coral">Failed to load data: {error}</div>;

  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#C8C7C2" : "#4A4A4A";

  const localities = getIndexData(store, season, persona).map((r) => r.locality).sort();

  const toggle = (loc: string) =>
    setSelected((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : prev.length < 3 ? [...prev, loc] : prev,
    );

  const details = selected
    .map((loc) => getLocalityDetail(store, loc, season, persona))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const radarData = DIMENSIONS.map((d) => {
    const row: Record<string, number | string> = { dimension: DIMENSION_LABELS[d] };
    details.forEach((det) => (row[det.locality] = dimScore(det, d)));
    return row;
  });

  const winner = [...details].sort((a, b) => b.composite_index - a.composite_index)[0];
  let winnerReason = "";
  if (winner) {
    const topDim = DIMENSIONS.reduce((a, b) => (dimScore(winner, b) > dimScore(winner, a) ? b : a));
    winnerReason = `For a ${PERSONAS[persona].label}, ${winner.locality} wins on ${DIMENSION_LABELS[topDim]} (score ${dimScore(winner, topDim)}).`;
  }

  const preferredBy = (loc: string): string[] =>
    PERSONA_KEYS.filter((p) => getIndexData(store, season, p)[0]?.locality === loc).map((p) => PERSONAS[p].label);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-text-primary">Compare localities</h1>
      <p className="mt-1 text-sm text-text-muted">Pick 2–3 localities to compare side by side.</p>

      {/* locality chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {localities.map((loc) => {
          const on = selected.includes(loc);
          const disabled = !on && selected.length >= 3;
          return (
            <button
              key={loc}
              onClick={() => toggle(loc)}
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-xs transition ${
                on
                  ? "bg-accent text-accent-fg"
                  : disabled
                  ? "cursor-not-allowed border border-border text-text-subtle opacity-40"
                  : "border border-border text-text-muted hover:border-accent"
              }`}
            >
              {loc}
            </button>
          );
        })}
      </div>

      {/* season + persona */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1.5">
          {SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`rounded-full px-3 py-1 text-xs ${s === season ? "bg-accent-soft text-accent" : "text-text-muted hover:text-text-primary"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value as Persona)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary"
        >
          {PERSONA_KEYS.map((p) => (
            <option key={p} value={p}>
              {PERSONAS[p].label}
            </option>
          ))}
        </select>
      </div>

      {details.length < 2 ? (
        <p className="mt-10 text-text-muted">Select at least two localities to compare.</p>
      ) : (
        <>
          {/* side-by-side cards */}
          <div className={`mt-6 grid gap-4 ${details.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            {details.map((det) => (
              <div key={det.locality} className="card rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-xl font-semibold text-text-primary">{det.locality}</div>
                    <div className="text-xs text-text-muted">{getZone(det.locality)} zone</div>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">#{det.rank}</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <ScoreNum value={det.composite_index} />
                  <span className={`text-sm font-medium ${verdictClass(det.verdict)}`}>{det.verdict}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {DIMENSIONS.map((d) => (
                    <div key={d}>
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>{DIMENSION_LABELS[d]}</span>
                        <span className="text-text-primary">{dimScore(det, d)}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <div style={{ width: `${dimScore(det, d)}%`, background: DIMENSION_COLORS[d], height: "100%" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="mt-4 space-y-1 text-xs text-text-muted">
                  {getTradeOffSummary(det, season).slice(0, 3).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                {preferredBy(det.locality).length > 0 && (
                  <div className="mt-3 text-[11px] text-text-subtle">
                    Best for: {preferredBy(det.locality).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* radar overlay */}
          <div className="card mt-6 rounded-2xl p-5">
            <div className="mb-2 text-sm text-text-muted">Dimension overlay</div>
            <ResponsiveContainer width="100%" height={340}>
              <ReRadar data={radarData} outerRadius="75%">
                <PolarGrid stroke={gridColor} />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: textColor, fontSize: 12 }} />
                {details.map((det, i) => (
                  <Radar
                    key={det.locality}
                    name={det.locality}
                    dataKey={det.locality}
                    stroke={SERIES_COLORS[i]}
                    fill={SERIES_COLORS[i]}
                    fillOpacity={0.18}
                  />
                ))}
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                  }}
                />
                <Legend wrapperStyle={{ color: textColor }} />
              </ReRadar>
            </ResponsiveContainer>
          </div>

          {/* winner */}
          {winner && (
            <div className="card mt-6 rounded-2xl border-accent p-5 shadow-glow">
              <div className="text-xs uppercase tracking-wide text-text-muted">Best overall pick</div>
              <div className="mt-1 text-lg text-text-primary">{winnerReason}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
