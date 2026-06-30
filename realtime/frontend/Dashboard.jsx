// Dashboard.jsx — fault-tolerant real-time dashboard (React + Recharts + Tailwind).
//
// Deps:  npm i recharts        (Tailwind assumed configured)
// Backend:  uvicorn realtime.main:app --port 8000
//
// Connects to the FastAPI WebSocket, keeps a 20-point moving window, and shows:
//   * KPI cards (AQI now / forecast / top locality / mean index)
//   * an IMPUTATION-LAYER-ACTIVE badge that flashes when a corrupt packet is recovered
//   * a live AQI + forecast line chart
//   * a live ENTROPY-WEIGHTS line chart (how data-driven weights shift over time)
//   * a live top-10 ranking bar chart
//
// HONESTY: live AQI is a SIMULATED stream with injected corruption; rent/commute/
// amenities are real. Research results come from the Python pipeline, not this demo.

import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const WS_URL = "ws://localhost:8000/ws/live-metrics";
const WINDOW = 20;
const DIMS = ["rent", "col", "commute", "aqi", "safety", "lifestyle"];
const DIM_COLORS = {
  rent: "#c084fc", col: "#94a3b8", commute: "#38bdf8",
  aqi: "#f0abfc", safety: "#34d399", lifestyle: "#fbbf24",
};

const Card = ({ label, value, sub, danger }) => (
  <div className={`rounded-2xl border p-5 shadow-lg ${danger
    ? "border-rose-500/50 bg-gradient-to-br from-[#3a1228] to-[#2a1030] shadow-rose-500/20"
    : "border-purple-500/20 bg-gradient-to-br from-[#1a1530] to-[#221a3e] shadow-purple-500/10"}`}>
    <div className="text-xs uppercase tracking-wide text-purple-300/70">{label}</div>
    <div className="mt-1 text-3xl font-bold text-white">{value}</div>
    {sub && <div className="mt-1 text-sm text-purple-300">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [series, setSeries] = useState([]);        // AQI/forecast/mean window
  const [weights, setWeights] = useState([]);      // entropy-weights window
  const [latest, setLatest] = useState(null);
  const [status, setStatus] = useState("connecting…");
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setStatus("● live");
    ws.onclose = () => setStatus("✕ disconnected");
    ws.onerror = () => setStatus("✕ error");
    ws.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      setLatest(d);
      setSeries((p) => [...p, {
        step: d.step, aqi: d.aqi_now, forecast: d.aqi_forecast_next, meanIndex: d.mean_index,
      }].slice(-WINDOW));
      setWeights((p) => [...p, { step: d.step, ...d.entropy_weights }].slice(-WINDOW));
    };
    return () => ws.close();
  }, []);

  const imputing = latest?.imputed;

  return (
    <div className="flex min-h-screen bg-[#0f0c1d] text-purple-50">
      {/* sidebar */}
      <aside className="w-56 border-r border-purple-900/40 bg-[#140f26] p-6">
        <h1 className="text-lg font-semibold text-purple-300">● Pune Live Index</h1>
        <span className="mt-3 inline-block rounded-full bg-purple-800/60 px-3 py-1 text-[11px] text-purple-200">
          SIMULATED STREAM
        </span>

        {/* fault-tolerance badge */}
        <div className={`mt-4 rounded-xl border px-3 py-2 text-xs font-semibold transition
          ${imputing
            ? "animate-pulse border-rose-400 bg-rose-600/30 text-rose-200"
            : "border-emerald-500/30 bg-emerald-700/15 text-emerald-300/80"}`}>
          {imputing ? "⚠ IMPUTATION LAYER ACTIVE" : "✓ stream nominal"}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-purple-300/60">
          Live AQI is simulated with injected corruption; the EMA imputation layer
          recovers corrupt packets. Rent/commute/amenities are real.
        </p>
        <p className="mt-6 text-xs text-purple-300/70">{status}</p>
      </aside>

      {/* main */}
      <main className="flex-1 p-8">
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card label="AQI now" value={latest?.aqi_now ?? "–"} sub={imputing ? "imputed (EMA)" : "observed"} danger={imputing} />
          <Card label="AQI forecast (next)" value={latest?.aqi_forecast_next ?? "–"} sub="EWMA + trend" />
          <Card label="Top locality" value={latest?.top_locality ?? "–"} sub={latest ? `index ${latest.top_index}` : ""} />
          <Card label="Imputed / rate" value={latest ? `${latest.total_imputed}` : "–"}
                sub={latest ? `${(latest.corruption_rate * 100).toFixed(0)}% • MAE ${latest.imputation_mae}` : ""} />
        </div>

        {/* live AQI line chart */}
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-[#1a1530] p-5">
          <div className="mb-3 text-sm text-purple-300/80">Live AQI stream (last {WINDOW} ticks)</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2244" />
              <XAxis dataKey="step" stroke="#9b93c7" fontSize={12} />
              <YAxis stroke="#9b93c7" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1a1530", border: "1px solid #322a52", borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="aqi" stroke="#c084fc" strokeWidth={2} dot={false} name="AQI (clean/imputed)" />
              <Line type="monotone" dataKey="forecast" stroke="#f0abfc" strokeWidth={2} strokeDasharray="5 4" dot={false} name="forecast" />
              <Line type="monotone" dataKey="meanIndex" stroke="#34d399" strokeWidth={2} dot={false} name="mean index" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* live entropy-weights line chart */}
        <div className="mb-6 rounded-2xl border border-purple-500/20 bg-[#1a1530] p-5">
          <div className="mb-3 text-sm text-purple-300/80">Entropy weights over time (data-driven)</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={weights}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2244" />
              <XAxis dataKey="step" stroke="#9b93c7" fontSize={12} />
              <YAxis stroke="#9b93c7" fontSize={12} domain={[0, "auto"]} />
              <Tooltip contentStyle={{ background: "#1a1530", border: "1px solid #322a52", borderRadius: 12 }} />
              <Legend />
              {DIMS.map((d) => (
                <Line key={d} type="monotone" dataKey={d} stroke={DIM_COLORS[d]} strokeWidth={2} dot={false} name={d} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* live ranking bar chart */}
        <div className="rounded-2xl border border-purple-500/20 bg-[#1a1530] p-5">
          <div className="mb-3 text-sm text-purple-300/80">Live ranking — top 10 localities</div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={latest?.ranking ?? []} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2244" />
              <XAxis type="number" stroke="#9b93c7" fontSize={12} domain={[0, 100]} />
              <YAxis type="category" dataKey="locality" stroke="#9b93c7" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: "#1a1530", border: "1px solid #322a52", borderRadius: 12 }} />
              <Bar dataKey="index" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}
