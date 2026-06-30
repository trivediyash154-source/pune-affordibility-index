"use client";

import { useCountUp } from "@/lib/hooks/useCountUp";

function KPINumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const n = useCountUp(value, 1.0, decimals);
  return (
    <span className="text-2xl font-semibold text-text-primary">
      {prefix}
      {n.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

function Card({ label, children, sub }: { label: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="glass glass-hover rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1">{children}</div>
      {sub && <div className="mt-0.5 text-xs text-text-subtle">{sub}</div>}
    </div>
  );
}

interface AqiRange {
  min: number;
  max: number;
  minStation: string;
  maxStation: string;
}

interface Props {
  aqiRange: AqiRange;
  stationCount: number;
  rent: number;
  bhk: number;
  topLocality: string;
  topScore: number;
}

export function KPIBar({ aqiRange, stationCount, rent, bhk, topLocality, topScore }: Props) {
  const { min, max, minStation, maxStation } = aqiRange;
  const aqiColor = max > 150 ? "text-coral" : max > 100 ? "text-amber" : "text-teal";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card label="Air quality (season)" sub={`AQI range across ${stationCount} stations`}>
        <span
          title={`Best: ${min} (${minStation})\nWorst: ${max} (${maxStation})`}
          className={`text-2xl font-semibold ${aqiColor}`}
        >
          {min}–{max}
        </span>
      </Card>
      <Card label={`Median rent (${bhk}BHK)`} sub="across localities">
        <KPINumber value={rent} prefix="₹" />
      </Card>
      <Card label="Top locality" sub={`index ${topScore}`}>
        <span className="font-display text-2xl font-semibold text-accent">{topLocality}</span>
      </Card>
    </div>
  );
}
