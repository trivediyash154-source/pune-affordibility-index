"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { DataStore, Season, recomputeWithWeights } from "@/lib/data";
import {
  DIMENSIONS,
  DIMENSION_COLORS,
  DIMENSION_LABELS,
  Dimension,
} from "@/lib/data/personas";

interface Props {
  store: DataStore;
  season: Season;
  defaults: Record<Dimension, number>;
  personaLabel: string;
}

export function WeightSliders({ store, season, defaults, personaLabel }: Props) {
  const [w, setW] = useState<Record<Dimension, number>>(defaults);

  useEffect(() => {
    setW(defaults);
  }, [defaults]);

  const onChange = (dim: Dimension, val: number) => {
    const others = DIMENSIONS.filter((d) => d !== dim);
    const restOld = others.reduce((s, d) => s + w[d], 0);
    const remaining = 1 - val;
    const next = { ...w, [dim]: val } as Record<Dimension, number>;
    if (restOld <= 0) {
      const eq = remaining / others.length;
      others.forEach((d) => (next[d] = eq));
    } else {
      others.forEach((d) => (next[d] = (w[d] / restOld) * remaining));
    }
    setW(next);
  };

  const top3 = recomputeWithWeights(store, season, w).slice(0, 3);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        {DIMENSIONS.map((d) => (
          <div key={d}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-text-muted">{DIMENSION_LABELS[d]}</span>
              <span className="font-semibold text-text-primary">{Math.round(w[d] * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={w[d]}
              onChange={(e) => onChange(d, parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)]"
              style={{ accentColor: DIMENSION_COLORS[d] }}
            />
          </div>
        ))}
        <button
          onClick={() => setW(defaults)}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Reset to {personaLabel} defaults
        </button>
      </div>

      <div>
        <div className="mb-3 text-xs uppercase tracking-wide text-text-subtle">Live top 3</div>
        <div className="space-y-2">
          {top3.map((r) => (
            <motion.div
              key={r.locality}
              layout
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="glass flex items-center justify-between rounded-xl px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="text-lg font-semibold text-accent">{r.rank}</span>
                <span className="font-medium text-text-primary">{r.locality}</span>
              </span>
              <span className="font-semibold tabular-nums text-text-primary">{r.index}</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-xs text-text-subtle">
          This is how the index works — transparent, tunable weights (always summing to 100%).
        </p>
      </div>
    </div>
  );
}
