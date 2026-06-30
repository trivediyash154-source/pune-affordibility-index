# Methodology — Pune Seasonal Affordability–Livability Index

This document explains, in plain language, **what** each step does, **why** it is
done that way, and **what its limitations are**. It is written so the author can
defend every choice in a viva and so a reviewer can reproduce every number.

All results come from `run_pipeline.py` (fixed seed = 42). Every produced field is
traced to a real source in [`data/processed/data_dictionary.csv`](../data/processed/data_dictionary.csv).

---

## Data sources (all real)

| Dimension | Source | Type | Year |
|---|---|---|---|
| Rent | MagicBricks Pune listings (1,779 rows) | per-listing | 2024–25 snapshot |
| Air quality | Katraj Dairy MPCB station, 15-min | measured | 2024–2025 |
| Commute | OSRM router over OSM road graph | computed | live |
| Amenities / safety | OpenStreetMap (osmnx/Overpass) | counts | live snapshot |
| Cost of living | Numbeo Pune (city baseline) | disclosed constant | 2024–25 |

No synthetic data is used. Where a real measurement does not exist, a clearly
labelled proxy is substituted (safety, single-station AQI) and listed below.

---

## STEP 1 — Study units (data-driven)

We keep a locality only if it has **≥ 15 Pune rent listings** (→ 27 localities,
954 listings). **Why:** below ~15 listings a locality's median rent is too noisy
to trust. Names are normalised conservatively (e.g., "Hinjawadi"→"Hinjewadi");
we do **not** merge distinct sub-areas, to keep provenance honest.

## STEP 2 — Rent dimension + ML

Listings are cleaned with a **physical-sanity filter** (drop area < 100 sqft,
beds > 5) and a **1.5×IQR rule applied within each BHK class** (a 4BHK is not an
outlier relative to 1BHKs). We predict per-listing rent from structural features
(area, beds, bathrooms, balconies, furnishing, locality). **`area_rate` is
excluded** because it equals rent/area and would leak the target. Rent is
log-transformed (right-skew); metrics are reported back in rupees under 5-fold CV.

**Result:** Linear Regression **R² = 0.84** (RMSE ₹13.3k) **beats** Random Forest
and XGBoost. **Why that is correct, not a bug:** rent is ~linear in size, with
few interactions and only ~928 rows, so ensembles cannot out-learn a well-specified
linear model. SHAP confirms **area ≫ beds > bathrooms > furnishing**; location
matters less than unit size.

## STEP 3 — Seasonal AQI (core contribution)

We compute the **official CPCB (2014) AQI**: per-pollutant sub-indices by
piecewise-linear interpolation over published breakpoints (PM2.5, PM10, NO2, SO2
on 24-hr means; CO, O3 on max 8-hr rolling means), then daily AQI = max sub-index
(requiring ≥ 3 pollutants incl. one PM, and ≥ 16 valid hours/day). Days are grouped
into **Monsoon / Winter / Summer** and averaged.

**Result (Katraj, 572 valid days):** Monsoon **50** (Satisfactory) → Summer **88**
→ Winter **115** (Moderate). Winter is **2.3× worse** than Monsoon; the dominant
pollutant shifts from CO (monsoon) to PM10 (winter). This matches the known Pune
airshed (monsoon scavenging; winter inversions) — a real, defensible signal.

## STEP 4 — Composite index, per season

Each dimension is min-max normalised to 0–100 (cost: `(max−x)/(max−min)`; benefit:
`(x−min)/(max−min)`) and combined as `index = Σ weightₚ · scoreₚ`. The index is
computed **once per season**; only AQI changes seasonally, so any ranking shift is
attributable to air quality.

**Result:** Winter top — Hinjewadi 70 (Excellent), Wagholi, Wakad. **Seasonal
Spearman ρ = 1.0 (no shift)** because, with one station, AQI is identical across
localities within a season → it cannot reorder them. The seasonal-shift mechanism
is built and validated; it activates automatically when more stations are added.

## STEP 5 — Research rigor

- **Entropy weights (objective):** measures each dimension's information dispersion.
  Correctly assigns ~0 to the flat dims (COL, AQI) but **over-weights the noisy
  safety proxy (0.37)** — illustrating that entropy rewards dispersion, not
  importance. We report subjective vs entropy as a **contrast**, not a replacement.
- **TOPSIS:** independent MCDA ranking. **Spearman ρ = 0.97** with the composite →
  strong **convergent validity** (different methods agree).
- **Monte-Carlo sensitivity (10,000 Dirichlet-perturbed weight vectors):**
  Hinjewadi P(top-3)=0.94, Wagholi 0.92 → the top of the ranking is robust; deeper
  ranks are weight-sensitive (reported honestly).
- **Pareto frontier (affordability vs livability):** non-dominated set =
  Koregaon Park, Hinjewadi, Wagholi, Pimpri-Chinchwad, Katraj.

---

## Related work & research gap

Established liveability / affordability indices are **static (annual) and
city-level**: the EIU *Global Liveability Index*, the Mercer *Quality of Living
Survey*, and Numbeo's *Cost of Living / Quality of Life* indices all publish one
score per city per year. None resolves **intra-city, intra-year (seasonal)**
variation in environmental quality.

**Gap & claim.** We show that air quality at a Pune station varies **2.3× between
seasons** (Monsoon AQI 50 vs Winter 115). For a user who weights environmental
quality (e.g., the remote-worker persona, AQI weight 0.30), a static index is
therefore misleading. To our knowledge this is the **first Pune affordability–
livability index to compute the score per season** and to quantify the resulting
ranking (in)stability. *(Author: insert 3 peer-reviewed citations from your
literature review here; the three indices above are real, verifiable anchors.)*

## Persona weight vectors

| Persona | rent | col | commute | aqi | safety | lifestyle |
|---|---|---|---|---|---|---|
| Student / Fresher | 0.45 | 0.20 | 0.10 | 0.05 | 0.15 | 0.05 |
| Junior IT | 0.30 | 0.15 | 0.25 | 0.15 | 0.10 | 0.05 |
| Senior IT | 0.15 | 0.10 | 0.15 | 0.10 | 0.20 | 0.30 |
| Family with Kids | 0.10 | 0.10 | 0.10 | 0.15 | 0.25 | 0.30 |
| Remote Worker | 0.20 | 0.15 | 0.05 | 0.30 | 0.10 | 0.20 |

Each vector sums to 1.0 and is editable in `config.yaml`. **Validation numbers:**
composite-vs-TOPSIS Spearman ρ = **0.97** (methods agree); composite-vs-entropy
ρ = **0.50** (entropy over-weights the noisy safety proxy — reported as a contrast,
not a replacement).

## Formal equations

**Min-max normalisation** (criterion *j*, alternative *i*); cost criteria inverted so
higher = better:
- benefit: `s_ij = (x_ij − min_i x_ij) / (max_i x_ij − min_i x_ij) × 100`
- cost:    `s_ij = (max_i x_ij − x_ij) / (max_i x_ij − min_i x_ij) × 100`

**Composite index:** `I_i = Σ_j w_j · s_ij`, with `Σ_j w_j = 1`.

**Entropy Weight Method (EWM)** on the benefit-oriented score matrix (m alternatives, n criteria):
1. proportions `p_ij = s_ij / Σ_i s_ij`
2. entropy `e_j = −k Σ_i p_ij ln p_ij`, with `k = 1/ln(m)`
3. divergence `d_j = 1 − e_j`
4. weights `w_j = d_j / Σ_j d_j`  (flat criteria → e_j→1 → w_j→0)

**TOPSIS:**
1. vector norm `r_ij = x_ij / √(Σ_i x_ij²)`
2. weighted `v_ij = w_j r_ij`
3. ideal best/worst (benefit-oriented): `A⁺_j = max_i v_ij`, `A⁻_j = min_i v_ij`
4. separations `S⁺_i = √(Σ_j (v_ij − A⁺_j)²)`, `S⁻_i = √(Σ_j (v_ij − A⁻_j)²)`
5. closeness `C_i = S⁻_i / (S⁺_i + S⁻_i)`; rank by `C_i` descending.

**Online EMA imputation (streaming fault tolerance).** Let `H` be the buffer of the
last ≤50 *valid* AQI readings and `α = 2/(span+1)` (span=10). A streamed reading
`o_t` is *corrupt* if `o_t ∈ {None, NaN, ±∞}` or `o_t ∉ [0, 500]`. Then:
- if valid: `x_t = o_t`, append to `H`;
- if corrupt: impute `x̂_t = EMA_t`, where `EMA_t = α·x_t + (1−α)·EMA_{t−1}` over `H`.
The (imputed) value feeds the dynamic index/TOPSIS. **Motivation:** the real Katraj
feed already has ~25–30 % missing pollutant readings (Step 3); a 15 % fault-injection
rate stress-tests recovery, and imputation error is reported as MAE vs the known
simulated truth.

## Limitations (honest, for the paper)

1. **Single AQI station.** The seasonal AQI signal is real for Katraj/south Pune
   but is applied as a city-wide proxy elsewhere; consequently **seasonal ranking
   shifts are ≈ 0 until more pollutant stations are added.** This is the most
   important limitation and the clearest direction for future work.
2. **Safety is a proxy.** No open locality-level crime data exists for Pune. We use
   OSM police-station density, which is weak and **possibly inverted** (police
   presence can track higher reported crime). It should be down-weighted or
   omitted; we sensitivity-test the ranking with respect to it.
3. **Cost of living is city-level.** Numbeo gives one Pune figure; we disclose it as
   a constant rather than fabricate locality variation. It does not discriminate
   localities.
4. **Rent is a cross-sectional snapshot** (no dates), so rent itself is not seasonal;
   only AQI drives the seasonal story.
5. **Rent ML n ≈ 928** is modest for ensembles; we report mean±std across folds.
6. **OSM completeness varies by area**; counts are a snapshot (date recorded).
7. **No ground truth for "affordability"** exists, so we claim **transparency,
   reproducibility and convergent validity (TOPSIS agreement)** — not accuracy.
8. **AQI timestamps labelled +0000**; for monthly/seasonal means the IST offset is
   immaterial.
9. **Streaming layer is a simulated demo.** The live dashboard's AQI is a simulated
   stream with *injected* corruption; it demonstrates a fault-tolerant online-imputation
   architecture (motivated by the real ~25-30 % missingness) but is **not** a real-time
   sensor and is **not** a source of paper results. All reported results come from the
   offline pipeline on real data.
