// Data layer: load the real pipeline CSVs from /public/data and expose typed
// accessors. Pure helpers take a DataStore so they are unit-testable; loadAllData()
// fetches + parses once and caches (browser).

import Papa from "papaparse";
import {
  Dimension,
  DIMENSIONS,
  Persona,
  PERSONA_LABEL_TO_KEY,
} from "./personas";

export type Season = "Monsoon" | "Summer" | "Winter";
export type Verdict = "Excellent" | "Good" | "Average" | "Below Average";
export const SEASONS: Season[] = ["Monsoon", "Summer", "Winter"];

export interface IndexRow {
  locality: string;
  season: Season;
  persona: Persona;
  composite_index: number;
  rank: number;
  verdict: Verdict;
  rent_score: number;
  col_score: number;
  commute_score: number;
  aqi_score: number;
  safety_score: number;
  lifestyle_score: number;
}

export interface RentRow {
  locality: string;
  n_listings?: number;
  median_rent: number;
  median_rent_per_sqft: number;
  median_area: number;
  median_rent_1?: number;
  median_rent_2?: number;
  median_rent_3?: number;
}
export interface AqiRow {
  station: string;
  season: Season;
  mean_aqi: number;
  category: string;
  dominant_pollutant: string;
}
export interface CommuteRow {
  locality: string;
  nearest_hub: string;
  commute_min: number;
  commute_km: number;
}
export interface AmenityRow {
  locality: string;
  hospitals: number;
  schools: number;
  police: number;
  cafes: number;
  parks: number;
  malls: number;
  transit: number;
  lifestyle_raw: number;
  safety_raw: number;
}
export interface SensitivityRow {
  locality: string;
  mean_rank: number;
  rank_ci_lower: number;
  rank_ci_upper: number;
  p_top3: number;
  p_top5: number;
}
export interface GeoRow {
  place: string;
  lat: number;
  lon: number;
}
export interface AqiStationRow {
  locality: string;
  aqi_station: string;
  monsoon_aqi: number;
  summer_aqi: number;
  winter_aqi: number;
}

export interface DataStore {
  index: IndexRow[];
  rent: RentRow[];
  aqi: AqiRow[];
  commute: CommuteRow[];
  amenities: AmenityRow[];
  sensitivity: SensitivityRow[];
  geocoded: GeoRow[];
  aqiMapping: AqiStationRow[];
}

async function fetchCsv<T>(file: string): Promise<T[]> {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`failed to load ${file}: ${res.status}`);
  const text = await res.text();
  const parsed = Papa.parse<T>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return parsed.data as T[];
}

let _store: DataStore | null = null;

export async function loadAllData(): Promise<DataStore> {
  if (_store) return _store;
  const [indexRaw, rent, aqiRaw, commute, amenities, sensitivity, geocoded, aqiMapping] =
    await Promise.all([
      fetchCsv<Record<string, unknown>>("composite_index.csv"),
      fetchCsv<RentRow>("locality_rent.csv"),
      fetchCsv<Record<string, unknown>>("aqi_seasonal.csv"),
      fetchCsv<CommuteRow>("commute.csv"),
      fetchCsv<AmenityRow>("amenities.csv"),
      fetchCsv<SensitivityRow>("sensitivity_ranks.csv"),
      fetchCsv<GeoRow>("geocoded.csv"),
      fetchCsv<AqiStationRow>("aqi_station_mapping.csv"),
    ]);

  const index: IndexRow[] = indexRaw
    .filter((r) => r.locality)
    .map((r) => ({
      ...(r as unknown as IndexRow),
      persona: PERSONA_LABEL_TO_KEY[String(r.persona)],
    }));

  const aqi: AqiRow[] = aqiRaw.map((r) => ({
    station: String(r.station),
    season: r.season as Season,
    mean_aqi: Number(r.mean_aqi),
    category: String(r.category),
    dominant_pollutant: String(r.dominant_pollutant),
  }));

  _store = { index, rent, aqi, commute, amenities, sensitivity, geocoded, aqiMapping };
  return _store;
}

// ---- pure accessors (take a store) ----
export function getIndexData(s: DataStore, season: Season, persona: Persona): IndexRow[] {
  return s.index
    .filter((r) => r.season === season && r.persona === persona)
    .sort((a, b) => a.rank - b.rank);
}

export function getLocalityDetail(
  s: DataStore,
  locality: string,
  season: Season,
  persona: Persona,
): IndexRow | undefined {
  return s.index.find(
    (r) => r.locality === locality && r.season === season && r.persona === persona,
  );
}

export function getLocalityAllSeasons(
  s: DataStore,
  locality: string,
  persona: Persona,
): IndexRow[] {
  return s.index.filter((r) => r.locality === locality && r.persona === persona);
}

export function getPersonaTopN(
  s: DataStore,
  persona: Persona,
  season: Season,
  n: number,
): IndexRow[] {
  return getIndexData(s, season, persona).slice(0, n);
}

export function getRankStability(s: DataStore, locality: string): number {
  const row = s.sensitivity.find((r) => r.locality === locality);
  return row ? Math.round(row.p_top5 * 100) : 0; // p_top5 (0-1) -> percent
}

export const getRent = (s: DataStore, locality: string) =>
  s.rent.find((r) => r.locality === locality);
export const getCommute = (s: DataStore, locality: string) =>
  s.commute.find((r) => r.locality === locality);
export const getAmenities = (s: DataStore, locality: string) =>
  s.amenities.find((r) => r.locality === locality);
export const getAqi = (s: DataStore, season: Season) =>
  s.aqi.find((r) => r.season === season);

// Per-locality, per-season AQI (via the locality's nearest station mapping).
export function getLocalityAQI(
  s: DataStore,
  locality: string,
  season: Season,
): { aqi: number; station: string } | undefined {
  const row = s.aqiMapping.find((r) => r.locality === locality);
  if (!row) return undefined;
  const key = `${season.toLowerCase()}_aqi` as "monsoon_aqi" | "summer_aqi" | "winter_aqi";
  return { aqi: row[key], station: row.aqi_station };
}

// Min/max AQI across the mapped stations for a season (for the KPI range card).
export function getSeasonAQIRange(
  s: DataStore,
  season: Season,
): { min: number; max: number; minStation: string; maxStation: string } {
  const key = `${season.toLowerCase()}_aqi` as "monsoon_aqi" | "summer_aqi" | "winter_aqi";
  const rows = s.aqiMapping.filter((r) => r[key] != null);
  if (!rows.length) return { min: 0, max: 0, minStation: "", maxStation: "" };
  const sorted = [...rows].sort((a, b) => a[key] - b[key]);
  return {
    min: Math.round(sorted[0][key]),
    max: Math.round(sorted[sorted.length - 1][key]),
    minStation: sorted[0].aqi_station,
    maxStation: sorted[sorted.length - 1].aqi_station,
  };
}
export const getAllAqi = (s: DataStore, season: Season) =>
  s.aqi.filter((r) => r.season === season);
export const getGeo = (s: DataStore, locality: string) =>
  s.geocoded.find((r) => r.place === locality);

// Dimension scores are weight-independent, so we can re-rank live with custom
// weights (used by the persona-page sliders).
export function recomputeWithWeights(
  s: DataStore,
  season: Season,
  weights: Record<Dimension, number>,
): { locality: string; index: number; rank: number }[] {
  const base = getIndexData(s, season, "student_fresher"); // any persona: same scores
  const scored = base.map((r) => ({
    locality: r.locality,
    index:
      DIMENSIONS.reduce(
        (sum, d) => sum + (weights[d] ?? 0) * (r[`${d}_score` as keyof IndexRow] as number),
        0,
      ),
  }));
  scored.sort((a, b) => b.index - a.index);
  return scored.map((x, i) => ({
    locality: x.locality,
    index: Math.round(x.index * 10) / 10,
    rank: i + 1,
  }));
}

export const dimScore = (r: IndexRow, d: Dimension): number =>
  r[`${d}_score` as keyof IndexRow] as number;
