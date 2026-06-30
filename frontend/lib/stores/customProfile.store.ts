"use client";

// Custom profile state + localStorage persistence (no external store dep needed).
import { Season } from "@/lib/data";
import { Dimension } from "@/lib/data/personas";

export type BHK = 1 | 2 | 3;

export interface CustomProfile {
  income: number;
  bhk: BHK;
  lifestyle: string;
  workMode: string;
  workHub: string;
  horizon: string;
  weights: Record<Dimension, number>; // percent, always sums to 100
  season: Season;
}

const KEY = "pune-index-custom-profile";

export const DEFAULT_WEIGHTS_PCT: Record<Dimension, number> = {
  rent: 30, col: 15, commute: 15, aqi: 15, safety: 15, lifestyle: 10,
};

export function defaultSeason(): Season {
  const m = new Date().getMonth() + 1; // 1-12
  if (m >= 6 && m <= 9) return "Monsoon";
  if (m >= 10 || m === 1) return "Winter";
  return "Summer";
}

export const DEFAULT_PROFILE: CustomProfile = {
  income: 50000,
  bhk: 1,
  lifestyle: "Single",
  workMode: "Hybrid",
  workHub: "Hinjewadi",
  horizon: "1-3y",
  weights: { ...DEFAULT_WEIGHTS_PCT },
  season: defaultSeason(),
};

export function loadProfile(): CustomProfile | null {
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as CustomProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: CustomProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / unavailable */
  }
}
