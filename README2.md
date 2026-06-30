# Pune Seasonal Affordability–Livability Index — Project State

**Read this file first in any new session.** It is the authoritative, verified state of
the project as of **2026-06-30**. Numbers below were re-derived directly from the CSVs
in `outputs/tables/` during this session — they are not copied from prior chat summaries,
because some prior in-repo docs (see "Known issue" below) are stale.

**Author:** Yash Trivedi, B.Tech CS, VIT Pune (first-year). **Goal:** real-data research
system + IEEE conference paper (target: IEEE GSCon 2027). Not a git repo (no `.git`).

---

## 1. What this project is

A reproducible Python pipeline + Next.js website that scores **27 real, data-driven Pune
localities** on a transparent **0–100 affordability–livability index** across six
dimensions (rent, cost of living, commute, air quality, safety, lifestyle), computed
**per season** (Monsoon/Summer/Winter), validated with MCDA methods (entropy weighting,
TOPSIS, Monte-Carlo sensitivity, Triangular-Fuzzy-Number stochastic TOPSIS), with a
rent-prediction ML model + SHAP, K-means/hierarchical clustering, a 5-persona
recommender, and a public-facing interactive website.

**Two absolute rules that have governed every decision:** (1) no fabricated data —
every number traces to a real source; (2) every proxy (safety, COL) is explicitly
labelled as a proxy, never presented as a direct measurement.

---

## 2. Real data sources (all verified live/working)

| Dimension | Source | Real/Proxy | Detail |
|---|---|---|---|
| Rent | MagicBricks listings, `data/raw/magicbricks_rentals.xlsx` | Real | 7,691 rows total → **1,779 Pune** rows → 954 in the 27 study localities → **928** after IQR-per-BHK cleaning |
| Air quality | **9 MPCB/IITM stations**, `data/raw/aqi/*.csv` (2024–25, 15-min) | Real | See §3 — this is the multi-station upgrade; originally only 1 station (Katraj) |
| Commute | OSRM road router over OSM graph | Real | `data/processed/commute.csv`, mean 8.6 min, max 15.3 min to nearest of 3 hubs (Hinjewadi/Kharadi/Shivaji Nagar) |
| Lifestyle | OpenStreetMap via osmnx (hospitals, schools, cafés, parks, malls, **transit**) | Real | `data/processed/amenities.csv` |
| Safety | OSM police-station count within 2 km | **Proxy** (weak, possibly inverted) | No open Pune crime data exists — stated as the #1 limitation everywhere |
| Cost of living | Numbeo Pune city baseline, ₹15,000/mo | **Proxy** (city-level constant) | `data/raw/col_baseline.csv` — deliberately NOT varied per locality (would be fabrication) |

Deprecated/unused real files kept only for provenance: `data/raw/pune_rr_rates.csv`
(IGR ready-reckoner, abandoned in favor of MagicBricks), `data/raw/aqi/opencity_mit_kothrud_2017_23.csv`.

---

## 3. The AQI upgrade — single station → 9 stations (this is the core contribution)

The project **started** with one station (Katraj) and the honest limitation "seasonal
ranking shift ≈ 0 because every locality shares the same AQI." That limitation **no
longer applies** — 9 real stations are now ingested and each of the 27 localities is
mapped to its nearest one (`config.yaml` → `aqi.stations`, each with a `nearby_localities`
list; the full mapping with per-season AQI per locality is in
`outputs/tables/aqi_station_mapping.csv` and `frontend/public/data/aqi_station_mapping.csv`).

**The 9 stations and their real winter AQI** (`outputs/tables/aqi_seasonal_all_stations.csv`):

| Station | Monsoon | Summer | Winter |
|---|---|---|---|
| Dhankawadi | 38.9 | 115.2 | 117.5 |
| Katraj Dairy | 50.5 | 88.3 | 114.5 |
| Karve Road | 52.9 | 146.9 | 111.5 |
| Panchawati-Pashan | 54.7 | 99.5 | **101.5 (best winter)** |
| Bhumkar Nagar | 66.1 | 143.5 | **182.4 (worst winter)** |
| Alandi | 62.3 | 120.2 | 132.5 |
| Bhosari | 65.1 | 107.7 | 119.6 |
| Hadapsar | 73.5 | 125.9 | 151.0 |
| Nigdi | 75.4 | 102.2 | 126.8 |

**Winter spread = 80.9 points** (101.5 → 182.4). This is the headline real-data finding.
Note: **Nigdi station exists but no study locality is mapped to it** (Nigdi the
locality didn't meet the ≥15-listing threshold), so it never appears in composite-index
results — this is correct behavior, not a bug (verified during this session).

---

## 4. Verified research numbers (recomputed fresh this session — trust these over any .md file)

```
Spearman ρ, Monsoon vs Winter (deterministic composite rank) = 0.925519
Spearman ρ, Monsoon vs Summer                                 = 0.897878
Spearman ρ, Summer  vs Winter                                  = 0.947031

Composite (subjective weights) vs TOPSIS rank, Spearman ρ      = 0.9072
Composite (subjective weights) vs Entropy-weight rank, ρ        = 0.6282

Entropy weights (objective, data-driven):
  rent=0.072  col=0.000  commute=0.106  aqi=0.233  safety=0.279  lifestyle=0.310
  (vs subjective: rent=0.35 col=0.20 commute=0.15 aqi=0.10 safety=0.10 lifestyle=0.10)

Rent model 5-fold CV (n=928 real listings):
  Linear Regression : R²=0.839 (±0.059)  RMSE=₹13,324  MAE=₹7,445   <- best, expected (simplest adequate model)
  XGBoost            : R²=0.798 (±0.031)  RMSE=₹15,729  MAE=₹7,865
  Random Forest       : R²=0.771 (±0.074)  RMSE=₹16,221  MAE=₹8,356

SHAP top 5 rent drivers (mean |SHAP| on log-rent, KernelExplainer):
  1. area                          0.1402
  2. beds                          0.1361
  3. bathrooms                     0.0854
  4. furnishing=Unfurnished        0.0626
  5. balconies                     0.0620
  (aggregate locality-dummy effect, summed = 0.228 > area alone; no single
   locality dummy beats area individually — "size dominates individually,
   location dominates in aggregate")

TFN stochastic TOPSIS, 10,000 Monte-Carlo runs, Student persona, Winter:
  Wagholi       P(Rank1)=1.000  P(Top3)=1.000  mean rank 1.00
  Wadgaon Sheri P(Rank1)=0.000  P(Top3)=1.000  mean rank 2.42
  Hinjewadi     P(Rank1)=0.000  P(Top3)=0.703  mean rank 2.92   <- only 70% confident in top-3
  Katraj        P(Rank1)=0.000  P(Top3)=0.297  mean rank 3.70
  Localities with |deterministic_rank - fuzzy_mean_rank| > 2  = 0

Monte-Carlo weight-perturbation sensitivity (10,000 runs, ±20%, default weights):
  Wadgaon Sheri  mean_rank=2.06  P(top3)=0.917  P(top5)=0.994
  Hinjewadi      mean_rank=3.06  P(top3)=0.648  P(top5)=0.818
  Wagholi        mean_rank=3.59  P(top3)=0.526  P(top5)=0.848

Top-5 composite index, Winter, default subjective weights (no persona):
  1. Wadgaon Sheri  68.1  Good
  2. Hinjewadi      68.0  Good
  3. Wagholi        66.5  Good
  4. Pimpri Chinchwad 65.7 Good
  5. Katraj         65.2  Good

Pareto-optimal (affordability vs livability), non-dominated set:
  Wadgaon Sheri, Hinjewadi, Wagholi, Katraj, Aundh
  (Pimpri Chinchwad, Kondhwa, Wakad, Hadapsar are dominated)

K-means/hierarchical clustering: k=5 selected by capped silhouette (k≤5 rule,
since k=27 localities; silhouette flat beyond k=5). Tier 1 (best): Aundh, Balewadi,
Baner, Hinjewadi, Kalyani Nagar, Koregaon Park, Wakad.
```

**⚠️ KNOWN ISSUE — fix before citing anything from the .md files:**
`outputs/methodology.md` (last edited during the single-station era) **still claims
ρ=1.0 and composite-vs-TOPSIS ρ=0.97 / composite-vs-entropy ρ=0.50** — all of these are
now **false** given the 9-station data above (real values: ρ=0.9255, TOPSIS-ρ=0.907,
entropy-ρ=0.628). `outputs/ieee_methodology.md` is fresher and correctly states the
Monsoon-vs-Winter ρ=0.9255 and the fuzzy-TOPSIS numbers, but it does **not** contain the
composite-vs-TOPSIS/entropy validation numbers at all. **Before writing the paper,
regenerate `outputs/methodology.md` from scratch (or delete it and rely solely on
`outputs/ieee_methodology.md`) using the verified numbers in §4 above, not anything
currently written in either file.** This is the single most important data-integrity
task left.

---

## 5. Code architecture

### Python pipeline (`run_pipeline.py`, `src/`)
Steps 1–8, run via `.venv/bin/python run_pipeline.py [--steps N...]`:
1. `preprocess.py` — study-unit selection (≥15 MagicBricks listings → 27 localities)
2. `rent.py` + `models.py` — IQR cleaning, Linear/RF/XGBoost CV, SHAP plot
3. `aqi.py` — CPCB official AQI sub-index computation (now over 9 stations), seasonal aggregation
4. `index.py` — min-max normalization, weighted composite per season, `composite_index.csv` (405 rows = 27×3×5)
5. `mcda.py` (entropy + TOPSIS), `sensitivity.py` (10k Monte-Carlo + 95% CI)
6. `recommend.py` — 5-persona transparent re-rank
7. `cluster.py` — K-means (silhouette-capped k≤5) + hierarchical + PCA plot
8. `viz.py` — EDA figures (rent-by-BHK, monthly AQI cycle)

Plus two standalone research modules **not** wired into `run_pipeline.py` (run directly):
- `src/fuzzy_topsis.py` — Triangular Fuzzy Number stochastic TOPSIS (Zadeh 1965 / Chen
  2000), 10,000 Monte-Carlo runs, `c=(m-l)/(u-l)` scipy.stats.triang parameterization
  (sanity-tested). Outputs `fuzzy_topsis_results.csv`, `deterministic_vs_fuzzy.csv`,
  two figures.
- `src/shap_rent.py` — retrains/loads `models/rent_model.pkl` (928 real rows — SHAP is
  statistically valid here; **never** applied to the 27-locality index), KernelExplainer,
  outputs `shap_feature_importance.csv` + figure.

`src/utils.py` has `record_provenance()` → auto-builds `data/processed/data_dictionary.csv`
(mirrored to `outputs/tables/data_dictionary.csv` at end of pipeline run). Every real
field's source/license/caveat is recorded here — this is the IEEE-reviewer-facing
provenance trail.

**Environment gotcha:** xgboost needs `libomp.dylib`, which isn't present without
Homebrew on this Mac. Fix already applied: copied the scikit-learn-vendored
`libomp.dylib` into the uv-managed Python's lib dir. If xgboost import fails in a new
environment, redo: `cp .venv/lib/python3.12/site-packages/sklearn/.dylibs/libomp.dylib <python_prefix>/lib/`.

### Frontend (`frontend/`, Next.js 14 + TypeScript + Tailwind + Framer Motion + Recharts)
7 routes, all building clean (`npm run build` → exit 0, 11 static pages):
- `/` — landing page (hero, stats, "why static indices fail", pipeline diagram)
- `/explorer` — main interactive page: season/persona sidebar, animated ranking table,
  KPI bar (AQI range card, fixed to use `getSeasonAQIRange()` — see §6), locality drawer
  with hand-coded SVG radar chart
- `/compare` — 2–3 locality side-by-side + Recharts radar overlay
- `/personas` — 5 persona hero cards (gradient, decorative) + budget pie + seasonal
  comparison + hidden gems + live weight sliders
- `/custom` — full custom-profile builder: income slider, BHK/lifestyle/work-mode chips,
  6 weight sliders (always sum to 100%), season toggle, results dashboard (top-3 cards,
  stacked dimension bar chart, rent-affordability line chart with budget reference line,
  honest "not a forecast" rent-trend panel). Persists to localStorage.
- `/methodology` — data sources table (real/proxy badges), formulas, limitations accordion
- `/research` — IEEE paper showcase: 4 result sections (AQI spread, seasonal ρ, fuzzy
  uncertainty, SHAP) with interactive Recharts + the 3 static research PNGs, citation
  block, reproducibility block, CSV/figure downloads

Data layer: `lib/data/index.ts` fetches CSVs from `public/data/*.csv` at runtime (not
build-time — they're plain `fetch()` calls, Papa-parsed). **If you add a new CSV to
`outputs/tables/`, you must also `cp` it into `frontend/public/data/` or the site won't
see it** (this caused the AQI-display bug fixed in §6).

Theme: light/dark via `data-theme` attribute + CSS vars in `globals.css`
(`lib/stores/theme.store.ts` + `components/ui/ThemeToggle.tsx`), anti-FOUC inline script
in `app/layout.tsx`. All chart components must read `useTheme()` and pass var-based
colors to Recharts (grid/tick/tooltip) — this was a real bug class fixed across the site.

**Critical operational rule:** never run `npm run build` while `npm run dev` is also
running — they share `.next/` and the build corrupts the dev server's served chunks
(404 on every `/_next/static/*` asset, site looks "completely broken"). If it happens:
`pkill -f "next dev"; rm -rf frontend/.next; cd frontend && npm run dev`.

### Realtime streaming demo (`realtime/`, separate from the Next.js site)
FastAPI + WebSocket backend (`main.py`, `ml_engine.py`) demonstrating a **fault-tolerant
online-imputation architecture**: simulates a live AQI tick (random-walks around the
real annual mean), injects 15% controlled corruption (None/NaN/out-of-bounds spikes),
recovers via online EMA over a `deque(maxlen=50)` history buffer, then runs live
entropy-weights + TOPSIS. Every packet is tagged `source:"simulated"`. This is a
**systems/presentation demo only** — motivated by the real ~25–30% missingness in the
raw 15-min AQI feeds, but it is explicitly NOT a source of paper results. A standalone
React `Dashboard.jsx` exists in `realtime/frontend/` (dark/purple aesthetic) but is
**not wired into the Next.js site** — it's a separate prototype. Run:
`.venv/bin/uvicorn realtime.main:app --reload --port 8000` (also has a vanilla-JS test
page at `realtime/static/index.html`, no React needed).

---

## 6. Bugs found and fixed this session (for context — don't re-fix these)

1. **AQI showing identical/zero values across localities in the drawer** — root cause
   was `getAqi(season)` in the frontend returning one global value instead of a
   per-locality lookup. Fixed by adding `getLocalityAQI()` reading
   `aqi_station_mapping.csv`. Verified: Hinjewadi=182.4(Bhumkar Nagar), Aundh=101.5
   (Panchawati-Pashan), Katraj=114.5 — all distinct now.
2. **Explorer KPI "Air quality" card showing 0** — `app/explorer/page.tsx` had a literal
   `aqi={0}` leftover from a refactor. Fixed with `getSeasonAQIRange()` → shows
   `min–max` (e.g. Winter "102–182", colored coral/amber/teal by severity) with a
   hover tooltip naming best/worst station.
3. **Site "not working at all" twice** — both times traced to: (a) no dev server
   actually running (I'd killed it after a verification test and forgot to leave one
   up), and (b) running `npm run build` concurrently with a live `npm run dev`,
   corrupting `.next/`. See the operational rule in §5.
4. Various hardcoded Tailwind colors (`bg-white`, `text-zinc-400`, etc.) that didn't
   adapt to light/dark theme — swept and replaced with semantic `var()`-backed classes
   across ~8 components; 4 intentional exceptions remain (modal scrim, white-text-on-
   gradient persona cards, black-text-on-bright-chart-segment — all theme-correct by design).

---

## 7. What's left to actually submit the paper

1. **Fix `outputs/methodology.md`** per §4 — currently contradicts the real, current
   multi-station numbers. Either regenerate it or fold everything into
   `outputs/ieee_methodology.md` and delete the stale one.
2. **`outputs/ieee_methodology.md` is missing** the composite-vs-TOPSIS (ρ=0.907) and
   composite-vs-entropy (ρ=0.628) validation numbers — these are real Step-5 pipeline
   results that should be in the paper's validation section alongside the fuzzy-TOPSIS
   material that's already there.
3. **Literature review citations** — the methodology doc has a placeholder
   ("insert 3 peer-reviewed citations from your literature review here") for the
   related-work/research-gap paragraph. Needs real citations (EIU Global Liveability,
   Mercer QoL, Numbeo, plus 2-3 academic MCDA/fuzzy-TOPSIS papers).
4. **Figures for the paper** — all already exist at 300 dpi in `outputs/figures/`
   (17 PNGs). Pick the subset that matches your final paper section structure;
   `/research` on the website surfaces the 3 most important ones already.
5. **Decide on safety proxy framing** — entropy weighting now assigns safety the
   *highest* objective weight (0.279) precisely because it's noisy/sparse (entropy
   rewards dispersion, not importance) — this is a good "gotcha" finding to discuss
   explicitly in the paper as a caution against blind objective weighting.
6. Not done, not required: real-time/streaming results are **not** part of the paper's
   evidence base by design (simulated data) — don't accidentally cite numbers from
   `realtime/` in the paper.

---

## 8. How to reproduce everything

```bash
cd /Users/yashtrivedi/da
.venv/bin/python run_pipeline.py                  # steps 1-8, seed=42, ~3-4 min cold
.venv/bin/python -c "from src.fuzzy_topsis import main; main()"   # TFN-TOPSIS (10k runs)
.venv/bin/python -c "from src.shap_rent import run_shap; run_shap()"  # SHAP

cd frontend
npm run dev                                        # http://localhost:3000 (7 routes)
# NEVER run `npm run build` while dev is running (see §5)

cd ../realtime
../.venv/bin/uvicorn main:app --reload --port 8000  # http://localhost:8000 (demo only)
```
