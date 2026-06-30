// Manual geographic zone grouping for the 27 study localities.
// Factual cardinal grouping (not a fabricated score) — documented for transparency.
export const ZONES: Record<string, string> = {
  Aundh: "West", Balewadi: "West", Baner: "West", Bavdhan: "West",
  Hinjewadi: "West", Mahalunge: "West",
  "Pimpri Chinchwad": "PCMC", Punawale: "PCMC", Moshi: "PCMC",
  Kharadi: "East", Hadapsar: "East", Magarpatta: "East", "Viman Nagar": "East",
  Wagholi: "East", "Keshav Nagar": "East", "Wadgaon Sheri": "East",
  Lohegaon: "East", Dhanori: "East", "EON Free Zone": "East", Manjri: "East",
  "Koregaon Park": "Central", "Kalyani Nagar": "Central",
  Katraj: "South", Kondhwa: "South", "NIBM Road": "South", Undri: "South",
};

export const getZone = (locality: string): string => ZONES[locality] ?? "—";
