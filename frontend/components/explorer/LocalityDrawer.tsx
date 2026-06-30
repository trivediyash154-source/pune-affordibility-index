"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  DataStore,
  Season,
  dimScore,
  getAmenities,
  getLocalityAQI,
  getCommute,
  getIndexData,
  getLocalityDetail,
  getRankStability,
  getRent,
} from "@/lib/data";
import {
  DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
  Dimension,
  PERSONAS,
  PERSONA_KEYS,
  Persona,
} from "@/lib/data/personas";
import { getZone } from "@/lib/data/zones";
import { getTradeOffSummary } from "@/lib/data/trade-off-rules";
import { RadarChart } from "@/components/charts/RadarChart";
import { useCountUp } from "@/lib/hooks/useCountUp";

const verdictClass = (v: string) =>
  v === "Excellent" ? "verdict-excellent" : v === "Good" ? "verdict-good" : v === "Average" ? "verdict-average" : "verdict-below";

function DimRow({ label, raw, score, color }: { label: string; raw: string; score: number; color: string }) {
  const s = useCountUp(score, 0.8, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-subtle">
          {raw} → <span className="font-semibold text-text-primary">{s}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: "100%", background: color, borderRadius: 999 }}
        />
      </div>
    </div>
  );
}

interface Props {
  store: DataStore;
  locality: string | null;
  season: Season;
  persona: Persona;
  onClose: () => void;
}

export function LocalityDrawer({ store, locality, season, persona, onClose }: Props) {
  const detail = locality ? getLocalityDetail(store, locality, season, persona) : undefined;

  let body: React.ReactNode = null;
  if (locality && detail) {
    const rent = getRent(store, locality);
    const commute = getCommute(store, locality);
    const amen = getAmenities(store, locality);
    const aqi = getLocalityAQI(store, locality, season);

    const rawByDim: Record<Dimension, string> = {
      rent: rent ? `₹${rent.median_rent.toLocaleString("en-IN")}/mo` : "—",
      col: "₹15,000 (city)",
      commute: commute ? `${commute.commute_min} min` : "—",
      aqi: aqi ? `${aqi.aqi} (${aqi.station})` : "—",
      safety: amen ? `${amen.police} police ≤2km` : "—",
      lifestyle: amen ? `${amen.lifestyle_raw} pts` : "—",
    };

    const cohort = getIndexData(store, season, persona);
    const average = DIMENSIONS.map(
      (d) => cohort.reduce((s, r) => s + dimScore(r, d), 0) / (cohort.length || 1),
    );
    const values = DIMENSIONS.map((d) => dimScore(detail, d));

    const bestFor = PERSONA_KEYS.map((p) => {
      const r = getIndexData(store, season, p).find((x) => x.locality === locality);
      return { persona: p, rank: r?.rank ?? 99 };
    }).filter((x) => x.rank <= 3);

    const stability = getRankStability(store, locality);

    body = (
      <>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text-primary">{locality}</h2>
            <p className="text-sm text-text-muted">
              {getZone(locality)} zone · <span className={verdictClass(detail.verdict)}>{detail.verdict}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
              #{detail.rank} of 27
            </span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-sunken">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {DIMENSIONS.map((d) => (
            <DimRow
              key={d}
              label={DIMENSION_LABELS[d]}
              raw={rawByDim[d]}
              score={dimScore(detail, d)}
              color={DIMENSION_COLORS[d]}
            />
          ))}
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-text-subtle">Trade-offs</h3>
          <ul className="space-y-1.5 text-sm text-text-muted">
            {getTradeOffSummary(detail, season).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        {amen && (
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-text-muted">
            <span>🏥 {amen.hospitals}</span>
            <span>🏫 {amen.schools}</span>
            <span>☕ {amen.cafes}</span>
            <span>🌳 {amen.parks}</span>
            <span>🚌 {amen.transit}</span>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-surface-sunken p-3 text-sm text-text-muted">
          🎯 Stays in the <span className="font-semibold text-text-primary">top 5</span> in{" "}
          <span className="font-semibold text-accent">{stability}%</span> of 10,000 random weight scenarios.
        </div>

        <div className="mt-6 flex flex-col items-center">
          <h3 className="mb-1 self-start text-xs uppercase tracking-wide text-text-subtle">
            Profile vs cohort average
          </h3>
          <RadarChart
            values={values}
            average={average}
            labels={DIMENSIONS.map((d) => DIMENSION_LABELS[d])}
          />
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs uppercase tracking-wide text-text-subtle">Best for</h3>
          {bestFor.length ? (
            <div className="flex flex-wrap gap-2">
              {bestFor.map(({ persona: p, rank }) => (
                <span
                  key={p}
                  className="rounded-full border border-[var(--border)] bg-surface-sunken px-3 py-1 text-xs text-text-muted"
                >
                  {PERSONAS[p].icon} {PERSONAS[p].label} · #{rank}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-subtle">Not a top-3 pick for any persona this season.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <AnimatePresence>
      {locality && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto border-l border-[var(--border)] bg-surface p-6 sm:w-[400px]"
          >
            {body}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
