"use client";

import { motion } from "framer-motion";

interface Props {
  name: string;
  emoji: string;
  minAqi: number;
  maxAqi: number;
  liveAqi?: number;
  active: boolean;
  onClick: () => void;
}

export function SeasonCard({ name, emoji, minAqi, maxAqi, liveAqi, active, onClick }: Props) {
  const seasonColors = {
    Monsoon: "bg-[var(--teal-soft)] text-[var(--teal)] border-[var(--teal)] dark:bg-[var(--card-bg)] dark:text-[var(--text-primary)] dark:border-transparent",
    Summer: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)] dark:bg-[var(--card-bg)] dark:text-[var(--text-primary)] dark:border-transparent",
    Winter: "bg-[var(--indigo-soft)] text-[var(--indigo)] border-[var(--indigo)] dark:bg-[var(--card-bg)] dark:text-[var(--text-primary)] dark:border-transparent",
  };

  const activeClass = active 
    ? `shadow-glow ring-1 ring-[var(--accent)] ${seasonColors[name as keyof typeof seasonColors] || "bg-[var(--card-bg)]"}`
    : `bg-[var(--card-bg)] glass-hover`;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`glass w-full rounded-xl p-3 text-left transition-colors border border-[var(--card-border)] ${activeClass}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${active ? "text-accent" : "text-text-primary"}`}>
          {emoji} {name}
        </span>
        {active && <span className="text-xs text-accent">●</span>}
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        <div className="text-xs text-text-muted">
          Seasonal avg: {minAqi.toFixed(1)}–{maxAqi.toFixed(1)}
        </div>
        {liveAqi !== undefined && (
          <div className="text-[10px] text-accent/80 font-medium">
            Live: {liveAqi} ↑
          </div>
        )}
      </div>
    </motion.button>
  );
}
