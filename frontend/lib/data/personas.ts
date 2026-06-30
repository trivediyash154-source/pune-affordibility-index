// Persona metadata + dimension definitions. Weights mirror config.yaml exactly.

export type Persona =
  | "student_fresher"
  | "junior_it"
  | "senior_it"
  | "family_kids"
  | "remote_worker";

export type Dimension =
  | "rent"
  | "col"
  | "commute"
  | "aqi"
  | "safety"
  | "lifestyle";

export const DIMENSIONS: Dimension[] = [
  "rent",
  "col",
  "commute",
  "aqi",
  "safety",
  "lifestyle",
];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  rent: "Rent",
  col: "Cost of living",
  commute: "Commute",
  aqi: "Air quality",
  safety: "Safety",
  lifestyle: "Lifestyle",
};

export const DIMENSION_COLORS: Record<Dimension, string> = {
  rent: "#F0A500",
  col: "#8A8A9A",
  commute: "#38BDF8",
  aqi: "#2DD4BF",
  safety: "#E8614A",
  lifestyle: "#C084FC",
};

export interface PersonaMeta {
  key: Persona;
  label: string; // must match the label in composite_index.csv
  icon: string;
  income: number;
  bhk: number;
  hub: string;
  priority: string;
  description: string;
  gradient: string;
  weights: Record<Dimension, number>;
}

export const PERSONAS: Record<Persona, PersonaMeta> = {
  student_fresher: {
    key: "student_fresher",
    label: "Student / Fresher",
    icon: "🎓",
    income: 25000,
    bhk: 1,
    hub: "Shivaji Nagar",
    priority: "Lowest rent + safety",
    description: "Tight budget, 1BHK, near college and transit.",
    gradient: "from-blue-950 to-blue-900",
    weights: { rent: 0.45, col: 0.2, commute: 0.1, aqi: 0.05, safety: 0.15, lifestyle: 0.05 },
  },
  junior_it: {
    key: "junior_it",
    label: "Junior IT Professional",
    icon: "💻",
    income: 55000,
    bhk: 1,
    hub: "Hinjewadi",
    priority: "Short commute + clean air",
    description: "Early-career techie, 1BHK, near the IT hubs.",
    gradient: "from-emerald-950 to-emerald-900",
    weights: { rent: 0.3, col: 0.15, commute: 0.25, aqi: 0.15, safety: 0.1, lifestyle: 0.05 },
  },
  senior_it: {
    key: "senior_it",
    label: "Senior IT Professional",
    icon: "🏢",
    income: 120000,
    bhk: 2,
    hub: "Kharadi",
    priority: "Amenities + safety",
    description: "Established professional, 2BHK, premium lifestyle.",
    gradient: "from-purple-950 to-purple-900",
    weights: { rent: 0.15, col: 0.1, commute: 0.15, aqi: 0.1, safety: 0.2, lifestyle: 0.3 },
  },
  family_kids: {
    key: "family_kids",
    label: "Family with Kids",
    icon: "👨‍👩‍👧",
    income: 150000,
    bhk: 3,
    hub: "Shivaji Nagar",
    priority: "Schools + safety + parks",
    description: "Family of four, 3BHK, schools and green space.",
    gradient: "from-orange-950 to-orange-900",
    weights: { rent: 0.1, col: 0.1, commute: 0.1, aqi: 0.15, safety: 0.25, lifestyle: 0.3 },
  },
  remote_worker: {
    key: "remote_worker",
    label: "Remote Worker",
    icon: "🏠",
    income: 80000,
    bhk: 2,
    hub: "Hinjewadi",
    priority: "Air quality + cafés",
    description: "Works from home, 2BHK, prioritises air and ambience.",
    gradient: "from-teal-950 to-teal-900",
    weights: { rent: 0.2, col: 0.15, commute: 0.05, aqi: 0.3, safety: 0.1, lifestyle: 0.2 },
  },
};

export const PERSONA_KEYS = Object.keys(PERSONAS) as Persona[];

// composite_index.csv stores the LABEL; map it back to our key.
export const PERSONA_LABEL_TO_KEY: Record<string, Persona> = Object.fromEntries(
  PERSONA_KEYS.map((k) => [PERSONAS[k].label, k]),
) as Record<string, Persona>;
