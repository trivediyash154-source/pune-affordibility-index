"use client";

import { motion } from "framer-motion";
import {
  DIMENSIONS,
  DIMENSION_COLORS,
  Dimension,
  PersonaMeta,
} from "@/lib/data/personas";

function MiniWeightBar({ weights }: { weights: Record<Dimension, number> }) {
  return (
    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
      {DIMENSIONS.map((d) => (
        <div
          key={d}
          title={`${d} ${Math.round(weights[d] * 100)}%`}
          style={{ width: `${weights[d] * 100}%`, background: DIMENSION_COLORS[d] }}
        />
      ))}
    </div>
  );
}

interface Props {
  persona: PersonaMeta;
  active: boolean;
  onClick: () => void;
}

export function PersonaCard({ persona, active, onClick }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass w-full rounded-xl p-3 text-left ${
        active ? "border-accent shadow-glow" : "glass-hover"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{persona.icon}</span>
        <span className={`flex-1 text-sm font-medium ${active ? "text-accent" : "text-text-primary"}`}>
          {persona.label}
        </span>
        {active && <span className="text-xs text-accent">✓</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent">
          ₹{persona.income.toLocaleString("en-IN")}
        </span>
        <span className="text-[10px] text-text-subtle">{persona.bhk}BHK</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-text-muted">{persona.description}</p>
      <MiniWeightBar weights={persona.weights} />
    </motion.button>
  );
}
