// Plain-English trade-off summaries generated from normalised dimension scores.
// Purely descriptive (no fabricated numbers) — each line is gated by a score rule.

import { IndexRow, Season } from "./index";

export function getTradeOffSummary(r: IndexRow, season: Season): string[] {
  const out: string[] = [];
  const { rent_score, aqi_score, commute_score, lifestyle_score, safety_score } = r;

  if (rent_score >= 75) out.push("💰 Excellent value — rent well below the area median.");
  else if (rent_score <= 35) out.push("⚠️ Premium pricing — above the 75th percentile for Pune.");

  if (aqi_score <= 40 && season === "Winter")
    out.push("😷 Poor winter air — weigh the AQI impact on health.");
  else if (aqi_score >= 65)
    out.push("🌿 Relatively clean air this season.");

  if (commute_score >= 85) out.push("🚗 Outstanding connectivity — among the fastest commutes to a hub.");
  else if (commute_score <= 35) out.push("🛣️ Long commute — far from the major work hubs.");

  if (lifestyle_score >= 70) out.push("☕ Rich amenity scene — cafés, parks and hospitals nearby.");
  else if (lifestyle_score <= 30) out.push("🏗️ Sparse amenities — an emerging / peripheral area.");

  if (safety_score <= 30) out.push("⚡ Limited police presence within 2 km (proxy measure).");
  else if (safety_score >= 70) out.push("🛡️ Strong police-station coverage nearby (proxy measure).");

  if (rent_score >= 70 && aqi_score <= 50)
    out.push("🔁 Classic trade-off: affordable, but air quality suffers in winter.");
  if (lifestyle_score >= 70 && rent_score <= 40)
    out.push("🔁 Premium lifestyle comes at a premium rent here.");

  if (out.length === 0) out.push("➖ A balanced profile with no single standout dimension.");
  return out;
}
