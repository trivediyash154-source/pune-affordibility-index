"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

// Theme-aware brand colors (CSS vars resolve per light/dark).
const COLORS = ["var(--accent)", "var(--teal)", "var(--coral)", "var(--amber)"];

export function BudgetPie({ income }: { income: number }) {
  const rent = Math.round(income * 0.3);
  const col = 15000;
  const commute = 2500;
  const savings = Math.max(0, income - rent - col - commute);
  const data = [
    { name: "Rent (30%)", value: rent },
    { name: "Cost of living", value: col },
    { name: "Commute (est.)", value: commute },
    { name: "Savings", value: savings },
  ];

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-lg font-semibold text-text-primary">
            ₹{(rent + col + commute).toLocaleString("en-IN")}/mo
          </div>
          <div className="text-[11px] text-text-muted">to live well</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
            <span className="text-text-muted">{d.name}</span>
            <span className="ml-auto text-text-primary">₹{d.value.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
