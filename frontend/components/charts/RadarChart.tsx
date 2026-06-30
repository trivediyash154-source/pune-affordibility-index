"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/stores/theme.store";

interface Props {
  values: number[];   // 0-100 per axis (this locality)
  average: number[];  // 0-100 per axis (cohort average)
  labels: string[];
  size?: number;
}

export function RadarChart({ values, average, labels, size = 240 }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#C8C7C2" : "#4A4A4A";
  const avgFill = isDark ? "rgba(138,138,154,0.12)" : "rgba(0,0,0,0.06)";

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 30;
  const n = values.length;

  const point = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = (vals: number[]) =>
    vals.map((v, i) => point(i, (R * Math.max(0, Math.min(100, v))) / 100).join(",")).join(" ");

  const rings = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} role="img" aria-label="dimension radar chart">
      {rings.map((r) => (
        <polygon
          key={r}
          points={labels.map((_, i) => point(i, (R * r) / 100).join(",")).join(" ")}
          fill="none"
          stroke={gridColor}
        />
      ))}
      {labels.map((l, i) => {
        const [x, y] = point(i, R);
        const [lx, ly] = point(i, R + 16);
        return (
          <g key={l}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={gridColor} />
            <text x={lx} y={ly} fontSize="9" fill={textColor} textAnchor="middle" dominantBaseline="middle">
              {l}
            </text>
          </g>
        );
      })}
      <polygon points={poly(average)} fill={avgFill} stroke={textColor} strokeWidth="1" strokeDasharray="3 3" />
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 16 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <polygon points={poly(values)} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
      </motion.g>
    </svg>
  );
}
