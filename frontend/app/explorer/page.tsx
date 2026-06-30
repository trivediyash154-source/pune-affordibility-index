"use client";

import { useState } from "react";
import { useData } from "@/lib/data/useData";
import { Season, SEASONS, getAllAqi, getIndexData, getSeasonAQIRange } from "@/lib/data";
import { Persona, PERSONA_KEYS, PERSONAS } from "@/lib/data/personas";
import { SeasonCard } from "@/components/explorer/SeasonCard";
import { PersonaCard } from "@/components/explorer/PersonaCard";
import { KPIBar } from "@/components/explorer/KPIBar";
import { RankingTable } from "@/components/explorer/RankingTable";
import { LocalityDrawer } from "@/components/explorer/LocalityDrawer";
import LiveAQIBanner from "@/components/ui/LiveAQIBanner";
import { useLiveAQI } from "@/lib/hooks/useLiveAQI";

const SEASON_EMOJI: Record<Season, string> = { Monsoon: "🌧️", Summer: "☀️", Winter: "🌫️" };

export default function ExplorerPage() {
  const { store, loading, error } = useData();
  const [season, setSeason] = useState<Season>("Winter");
  const [persona, setPersona] = useState<Persona>("student_fresher");
  const [selected, setSelected] = useState<string | null>(null);
  
  const { readings, isLive } = useLiveAQI();
  const liveAqi = isLive && readings["Pune"] ? readings["Pune"].aqi : undefined;

  if (loading) return <div className="p-10 text-text-muted">Loading real data…</div>;
  if (error || !store) return <div className="p-10 text-coral">Failed to load data: {error}</div>;

  const rows = getIndexData(store, season, persona);
  const top = rows[0];

  const bhk = PERSONAS[persona].bhk;
  const rentKey = `median_rent_${bhk}`;
  const rentVals = store.rent
    .map((r) => {
      const v = (r as unknown as Record<string, unknown>)[rentKey];
      return Number.isFinite(v) ? (v as number) : r.median_rent;
    })
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  const medianRent = rentVals.length ? rentVals[Math.floor(rentVals.length / 2)] : 0;

  const aqiRange = getSeasonAQIRange(store, season);
  // full monitored network (range extremes are within this set)
  const stationCount = new Set(store.aqi.map((r) => r.station)).size;

  return (
    <div className="flex min-h-screen">
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-[var(--border)] bg-surface/50 p-4 lg:block">
        <a href="/" className="font-display text-base font-semibold text-accent">
          ◂ Pune Index
        </a>
        <h2 className="mt-5 mb-2 text-xs uppercase tracking-wide text-text-subtle">Season</h2>
        <div className="space-y-2">
          {SEASONS.map((s) => {
            const allAqi = getAllAqi(store, s);
            const aqiVals = allAqi.map((a) => a.mean_aqi);
            const minAqi = aqiVals.length > 0 ? Math.min(...aqiVals) : 0;
            const maxAqi = aqiVals.length > 0 ? Math.max(...aqiVals) : 0;
            return (
              <SeasonCard
                key={s}
                name={s}
                emoji={SEASON_EMOJI[s]}
                minAqi={minAqi}
                maxAqi={maxAqi}
                liveAqi={s === "Summer" || s === "Monsoon" || s === "Winter" ? liveAqi : undefined} 
                active={s === season}
                onClick={() => setSeason(s)}
              />
            );
          })}
        </div>
        <h2 className="mt-6 mb-2 text-xs uppercase tracking-wide text-text-subtle">Persona</h2>
        <div className="space-y-2">
          {PERSONA_KEYS.map((p) => (
            <PersonaCard
              key={p}
              persona={PERSONAS[p]}
              active={p === persona}
              onClick={() => setPersona(p)}
            />
          ))}
        </div>
      </aside>

      {/* main */}
      <main className="flex-1 space-y-5 p-6">
        <header>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Explorer</h1>
          <p className="text-sm text-text-muted">
            {PERSONAS[persona].icon} {PERSONAS[persona].label} · {SEASON_EMOJI[season]} {season} —
            27 localities ranked on the composite index.
          </p>
        </header>

        <LiveAQIBanner />

        <KPIBar
          aqiRange={aqiRange}
          stationCount={stationCount}
          rent={medianRent}
          bhk={bhk}
          topLocality={top?.locality ?? "—"}
          topScore={top?.composite_index ?? 0}
        />

        <RankingTable rows={rows} onRowClick={setSelected} />

        <p className="max-w-3xl text-xs leading-relaxed text-text-subtle">
          AQI is measured across 9 real stations (MPCB/IITM). Both spatial and seasonal shifts affect localities differently based on their assigned station. The persona weight on AQI (5%–30%)
          determines how much air quality moves <em>your</em> score between seasons.
        </p>
      </main>

      <LocalityDrawer
        store={store}
        locality={selected}
        season={season}
        persona={persona}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
