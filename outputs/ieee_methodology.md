# A Stochastic Fuzzy-MCDA Framework for Seasonal Urban Livability Assessment: A Case Study of Pune

*Methodology draft for IEEE GSCon. All numbers below are produced by the
reproducible pipeline (seed = 42); every value traces to a real source.*

---

## Section 1 — Abstract

Urban affordability indices guide where students and professionals choose to live,
yet existing indices (e.g., EIU Global Liveability, Mercer Quality of Living, Numbeo)
are **static, city-wide, and deterministic** — they collapse intra-city spatial
variation, ignore seasonal environmental change, and assume a single crisp weight
vector despite the inherent vagueness of human preference. We present a
**multi-station, seasonally-dynamic, stochastic Fuzzy-TOPSIS** framework for 27 Pune
localities across six dimensions (rent, cost of living, commute, air quality, safety,
lifestyle), built entirely on real data: 1,779 MagicBricks listings, nine CPCB/MPCB
air-quality stations (2024–25), and OpenStreetMap amenities. Key results: the winter
AQI spread across stations is **80.9 points** (Panchawati-Pashan 101.5 vs Bhumkar
Nagar 182.4); the deterministic ranking shifts between seasons with **Spearman
ρ = 0.9255** (Monsoon vs Winter); Triangular-Fuzzy-Number TOPSIS over 10,000 Monte
Carlo runs converts point ranks into **rank probabilities** (e.g., for the student
persona in winter, Wagholi holds Rank 1 with probability 1.00 while Hinjewadi is
Top-3 with probability 0.70); and SHAP on the rent model identifies unit **area** as
the single strongest predictor while the aggregate **location** effect exceeds it.
The framework quantifies uncertainty that deterministic indices hide.

---

## Section 2 — Mathematical Framework

### 2.1 Min-Max Normalization
$$s_{ij} = \frac{x_{ij} - \min_i(x_{ij})}{\max_i(x_{ij}) - \min_i(x_{ij})} \times 100$$
For cost dimensions (rent, COL, commute, AQI) the score is inverted so that higher is always better:
$$s_{ij}^{cost} = 100 - s_{ij}$$

### 2.2 CPCB AQI Sub-Index Computation
$$I_p = \frac{I_{Hi} - I_{Lo}}{BP_{Hi} - BP_{Lo}} \times (C_p - BP_{Lo}) + I_{Lo}$$
where $C_p$ is the 24-hour mean concentration of pollutant $p$, $BP_{Hi}$/$BP_{Lo}$ are
the CPCB breakpoint concentrations bracketing $C_p$, and $I_{Hi}$/$I_{Lo}$ are the
corresponding AQI values. The station AQI is
$$AQI = \max_p(I_p), \quad \text{requiring} \geq 3 \text{ pollutants incl. one PM}.$$

### 2.3 Triangular Fuzzy Number Definition
$$\tilde{w}_j = (l_j, m_j, u_j), \quad l_j \leq m_j \leq u_j$$
$$\mu_{\tilde{w}}(x) = \begin{cases}
\frac{x - l}{m - l} & l \leq x \leq m \\
\frac{u - x}{u - m} & m < x \leq u \\
0 & \text{otherwise}
\end{cases}$$
We set $m_j$ = the persona's config weight, $l_j = 0.7\,m_j$, $u_j = 1.3\,m_j$.

### 2.4 Stochastic Fuzzy TOPSIS
In each Monte Carlo iteration $k \in \{1,\dots,K\}$, $K = 10{,}000$, a crisp weight is
drawn from the triangular law and renormalized:
$$w_j^{(k)} \sim \text{Triangular}(l_j, m_j, u_j), \quad
\hat{w}_j^{(k)} = \frac{w_j^{(k)}}{\sum_j w_j^{(k)}}.$$
With vector-normalized decision matrix $r_{ij} = x_{ij}/\sqrt{\sum_i x_{ij}^2}$, the
weighted matrix is $v_{ij}^{(k)} = \hat{w}_j^{(k)} r_{ij}$. Using the positive/negative
ideal solutions $A^+_j = \max_i v_{ij}^{(k)}$, $A^-_j = \min_i v_{ij}^{(k)}$ (all
criteria benefit-oriented after §2.1), the closeness coefficient is
$$C_i^{(k)} = \frac{d_i^{-(k)}}{d_i^{+(k)} + d_i^{-(k)}}, \quad
d_i^{\pm(k)} = \sqrt{\sum_j (v_{ij}^{(k)} - A^{\pm}_j)^2}.$$
The rank probability is
$$P(\text{rank}_i = r) = \frac{1}{K}\sum_{k=1}^{K} \mathbf{1}\big[\text{rank}(C_i^{(k)}) = r\big].$$

### 2.5 SHAP Feature Attribution (rent model)
$$\phi_j(f, x) = \sum_{S \subseteq F \setminus \{j\}}
\frac{|S|!\,(|F|-|S|-1)!}{|F|!}\big[f(S \cup \{j\}) - f(S)\big]$$
Global importance: $\bar{\phi}_j = \frac{1}{n}\sum_{i=1}^{n}|\phi_j(f,x_i)|$. The model
is Linear Regression on $n = 928$ cleaned listings (SHAP is valid at this $n$;
it is **not** applied to the 27-locality index).

---

## Section 3 — Results

**Table 1. Winter AQI by station (9 stations; full seasonal set in `aqi_seasonal.csv`).**

| Station | Winter AQI | | Station | Winter AQI |
|---|---|---|---|---|
| Panchawati-Pashan | 101.5 | | Nigdi | 126.8 |
| Karve Road | 111.5 | | Alandi | 132.5 |
| Katraj Dairy | 114.5 | | Hadapsar | 151.0 |
| Dhankawadi | 117.5 | | Bhumkar Nagar | 182.4 |
| Bhosari | 119.6 | | **Spread** | **80.9** |

**Table 2. Deterministic vs Fuzzy ranking — Student persona, Winter (top 10).**

| Locality | Det. rank | Fuzzy mean rank | Fuzzy std | P(Top 3) |
|---|---|---|---|---|
| Wagholi | 1 | 1.00 | 0.00 | 1.000 |
| Wadgaon Sheri | 2 | 2.42 | 0.49 | 1.000 |
| Hinjewadi | 3 | 2.92 | 0.93 | 0.703 |
| Katraj | 4 | 3.70 | 0.46 | 0.297 |
| Kondhwa | 5 | 4.97 | 0.18 | 0.000 |
| Pimpri Chinchwad | 6 | 6.08 | 0.47 | 0.000 |
| Undri | 7 | 7.09 | 0.48 | 0.000 |
| Mahalunge | 8 | 8.41 | 0.62 | 0.000 |
| Moshi | 9 | 8.71 | 1.05 | 0.000 |
| Wakad | 10 | 10.81 | 1.55 | 0.000 |

Localities whose mean rank moves by more than two positions vs deterministic: **0**.
The contribution is therefore not rank *reversal* but rank *confidence*: e.g.,
Hinjewadi's Top-3 status is only 70 % certain under weight uncertainty.

**Table 3. Rank probability matrix — Student persona, Winter (top 4).**

| Locality | P(Rank 1) | P(Top 3) | P(Top 5) |
|---|---|---|---|
| Wagholi | 1.000 | 1.000 | 1.000 |
| Wadgaon Sheri | 0.000 | 1.000 | 1.000 |
| Hinjewadi | 0.000 | 0.703 | 0.990 |
| Katraj | 0.000 | 0.297 | 1.000 |

**Table 4. Rent model performance (5-fold CV, metrics in ₹).**

| Model | R² | RMSE | MAE |
|---|---|---|---|
| **Linear Regression** | **0.839** | 13,324 | 7,445 |
| XGBoost | 0.798 | 15,729 | 7,865 |
| Random Forest | 0.771 | 16,221 | 8,356 |

**Table 5. SHAP feature importance — top 5 (mean \|SHAP\| on log-rent).**

| Rank | Feature | mean \|SHAP\| |
|---|---|---|
| 1 | area | 0.1402 |
| 2 | beds | 0.1361 |
| 3 | bathrooms | 0.0854 |
| 4 | furnishing = Unfurnished | 0.0626 |
| 5 | balconies | 0.0620 |

Unit **area** is the single strongest predictor (0.1402); however the **aggregate
locality** effect (Σ mean\|SHAP\| over locality dummies = 0.228) exceeds area, while no
single locality dummy does (max = 0.052). Interpretation: *size is the dominant
individual feature, but location collectively explains more of rent variance.*

---

## Section 4 — Honest Limitations

1. **Single-year AQI.** Stations cover 2024–25 only; multi-year means would be more robust.
2. **Cross-sectional rent.** MagicBricks listings are an undated snapshot, so rent has no temporal/seasonal component.
3. **Safety is a proxy.** OSM police-station density is a weak, possibly inverted proxy; no open locality-level crime data exists for Pune.
4. **OSM completeness varies** by area (denser in central Pune); snapshot dates are recorded.
5. **TFN ranges are model-defined** ($l = 0.7m$, $u = 1.3m$), not survey-derived; a preference-elicitation study would strengthen them.
6. **27 localities** is sufficient for the MCDM/fuzzy framework but **insufficient for standalone ML prediction** of the index; SHAP is therefore applied only to the 928-row rent model, never to the 27-locality index. Kriging was deliberately avoided (9 stations are too few for a stable variogram).

---

## Section 5 — Why This Outperforms Deterministic Indices

**Static indices collapse spatial variation.** A city-wide AQI figure for Pune hides a
**80.9-point** winter spread between Panchawati-Pashan (101.5) and Bhumkar Nagar
(182.4). By mapping each locality to its nearest of nine stations, our index preserves
this variation, so an environment-sensitive renter sees materially different scores
across localities that a single city number would flatten.

**Deterministic weights ignore preference uncertainty.** A "student" does not weight
rent at exactly 45 %; the true weight varies with family support and city of origin.
Modelling each weight as a Triangular Fuzzy Number and propagating it through 10,000
TOPSIS runs converts a single rank into a probability distribution. Even when the mean
ranking is stable (0 localities move by >2 positions here), the framework exposes
**confidence**: Hinjewadi is Top-3 with probability 0.70, not with certainty — a
distinction a deterministic table cannot express.

**Single-season analysis misleads seasonal decisions.** With nine stations the
deterministic ranking itself changes across seasons (Spearman ρ = 0.9255 between
Monsoon and Winter); the ordering is correlated but not identical. For personas that
weight AQI ≥ 0.15, the *score gaps* widen further in winter even where rank order is
preserved, so a monsoon-only or annual-average index would misinform a winter move.
Together, spatial resolution, fuzzy weighting, and seasonal computation turn a standard
MCDA application into a framework that quantifies the uncertainty real decisions face.
