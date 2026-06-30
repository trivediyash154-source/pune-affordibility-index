"use client";

import { motion } from "framer-motion";
import { IndexRow, dimScore } from "@/lib/data";
import { DIMENSIONS, DIMENSION_COLORS } from "@/lib/data/personas";
import { getZone } from "@/lib/data/zones";
import { useCountUp } from "@/lib/hooks/useCountUp";

const GRID = "grid grid-cols-[36px_1fr_72px_64px_104px_72px] items-center gap-3";

const verdictClass = (v: string) =>
  v === "Excellent"
    ? "verdict-excellent"
    : v === "Good"
    ? "verdict-good"
    : v === "Average"
    ? "verdict-average"
    : "verdict-below";

function MiniBars({ row }: { row: IndexRow }) {
  return (
    <div className="flex h-7 items-end gap-[3px]">
      {DIMENSIONS.map((d) => {
        const s = dimScore(row, d);
        return (
          <div key={d} className="flex h-full w-1.5 items-end rounded-sm bg-[var(--border)]" title={`${d}: ${s}`}>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${s}%` }}
              transition={{ duration: 0.6 }}
              style={{ width: "100%", background: DIMENSION_COLORS[d], borderRadius: 2 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Row({ row, index, onClick }: { row: IndexRow; index: number; onClick: () => void }) {
  const score = useCountUp(row.composite_index, 1.0, 1);
  return (
    <motion.button
      layout
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 27) * 0.04, layout: { type: "spring", stiffness: 420, damping: 36 } }}
      className={`bg-[var(--card-bg)] hover:bg-[var(--surface-sunken)] w-full rounded-xl px-4 py-2.5 text-left transition-colors border border-[var(--border)] ${GRID}`}
    >
      <motion.span layout className="text-lg font-semibold tabular-nums text-accent">
        {row.rank}
      </motion.span>
      <span className="truncate font-medium text-text-primary">{row.locality}</span>
      <span className="text-xs text-text-muted">{getZone(row.locality)}</span>
      <span className="font-semibold tabular-nums text-text-primary">{score}</span>
      <span className="flex items-center"><span className={`text-xs font-medium ${verdictClass(row.verdict)}`}>{row.verdict}</span></span>
      <MiniBars row={row} />
    </motion.button>
  );
}

export function RankingTable({
  rows,
  onRowClick,
}: {
  rows: IndexRow[];
  onRowClick: (locality: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`${GRID} px-4 text-[11px] uppercase tracking-wide text-text-subtle`}>
        <span>#</span>
        <span>Locality</span>
        <span>Zone</span>
        <span>Score</span>
        <span>Verdict</span>
        <span>Dims</span>
      </div>
      {rows.map((r, i) => (
        <Row key={r.locality} row={r} index={i} onClick={() => onRowClick(r.locality)} />
      ))}
    </div>
  );
}
