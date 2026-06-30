# PROJECT CONTEXT — Pune Affordability Index

> This file fully describes an existing Excel-based academic project so an AI coding
> agent can rebuild it as a real-data, ML-driven Python research system. It is the
> single source of truth for the project's structure, data schema, and methodology.
> (The original workbook `Pune_Affordability_Analytics_Enhanced.xlsx` and report
> `Pune_Affordability_Final_Report.docx` may also be in this folder — you may read them,
> but everything you need is summarized here.)

---

## 1. Identity & goal

- **Title:** Pune Affordability Index — A Data-Driven Cost-of-Living Analysis for Students & Young Professionals
- **Author / lead:** Yash Trivedi (B.Tech Computer Engineering, Vishwakarma Institute of Technology, Pune; SPPU). Course: Data Analysis. Guide: Prof. Rohini Jadhav.
- **What it does:** combines **six independent dimensions** of city life into a single transparent **0–100 Affordability Index** for **15 Pune localities**, with user-tunable weights, an interactive dashboard, and a **persona-based recommender** for 5 renter profiles.
- **Current implementation:** 100% Microsoft Excel (formulas only — AVERAGEIFS, SUMIFS, INDEX-MATCH, RANK, LARGE, named ranges, conditional formatting, 8 chart types). No Python in the live computation.
- **CRITICAL LIMITATION (the thing to fix):** the current data is **synthetic / simulated** ("Data is simulated for academic demonstration"). The goal of the rebuild is to replace it with **real, sourced data** and add **genuine machine learning**, to make it publishable at an IEEE conference (IEEE GSCon 2027).

---

## 2. The 15 localities (with current attributes)

| Locality | Zone | Base Rent 1BHK (₹) | Metro (0/1) | IT-Hub Proximity (0/1) | Posh Factor (1–10) |
|---|---|---|---|---|---|
| Kothrud | West | 18000 | 1 | 0 | 7 |
| Hinjewadi | West | 16000 | 0 | 1 | 6 |
| Wakad | West | 15000 | 0 | 1 | 6 |
| Baner | West | 22000 | 0 | 1 | 8 |
| Aundh | West | 24000 | 0 | 0 | 9 |
| Viman Nagar | East | 23000 | 0 | 0 | 8 |
| Kharadi | East | 19000 | 0 | 1 | 7 |
| Hadapsar | East | 14000 | 0 | 1 | 5 |
| Magarpatta | East | 21000 | 0 | 1 | 8 |
| Koregaon Park | Central | 30000 | 0 | 0 | 10 |
| Camp | Central | 20000 | 0 | 0 | 7 |
| Shivaji Nagar | Central | 17000 | 1 | 0 | 6 |
| Deccan | Central | 19000 | 1 | 0 | 7 |
| Pimpri | PCMC | 12000 | 1 | 0 | 4 |
| Chinchwad | PCMC | 13000 | 1 | 0 | 5 |

**Three major work hubs** used for commute: Hinjewadi, Kharadi, Shivaji Nagar.

---

## 3. The six dimensions & default weights

| # | Dimension | Default weight | Direction | Notes |
|---|---|---|---|---|
| 1 | Rent affordability | 0.35 | cost (lower better) | avg rent for selected BHK |
| 2 | Cost of living | 0.20 | cost | food + groceries + eating out + utilities + internet + gym |
| 3 | Commute (to work hub) | 0.15 | cost | monthly commute cost/time to chosen hub |
| 4 | Air quality (AQI) | 0.10 | cost | lower annual AQI better |
| 5 | Safety | 0.10 | benefit (higher better) | safety score 0–10 |
| 6 | Lifestyle & amenities | 0.10 | benefit | cafés, parks, malls, hospitals, schools |

Weights must sum to 1.00. User inputs also include: monthly income (default ₹60,000), recommended rent share (0.30), BHK preference, primary work hub.

---

## 4. Data schema (each Excel sheet = one future CSV/table)

- **Localities:** Locality, Zone, Base Rent 1BHK, Metro Connectivity (0/1), IT Hub Proximity (0/1), Posh Factor (1–10)
- **Rent_Listings** (n=603): Property ID, Locality, Zone, BHK (1/2/3BHK), Furnishing, Area SqFt, Monthly Rent, Security Deposit, Building Age Yrs, Rent per SqFt
- **Cost_of_Living:** Locality, Avg Food Delivery Order, Groceries Monthly, Eating Out Monthly, Utilities Monthly, Internet Monthly, Gym Monthly, Total Monthly Lifestyle
- **Commute:** Locality, Work Hub, Distance KM, Peak Travel Mins, Cab OneWay Cost, Monthly Commute Cost
- **Air_Quality:** Locality, Jan…Dec (monthly AQI), Annual_Avg
- **Safety_Amenities:** Locality, Safety Score (0–10), Hospitals, Schools, Shopping Malls, Parks, Cafes Count, Amenities Score (= Hospitals×1.5 + Schools×1.2 + Malls×2 + Parks)
- **Rent_Trend:** Month (2023-01 … 2024-12, 24 months), one column per locality = monthly 1BHK rent (time series)
- **Affordability_Index:** computed sub-scores + composite + rank + verdict
- **Persona_Recommender / Dashboard / Insights:** outputs

---

## 5. The index algorithm (replicate this exactly, then extend it)

For each dimension D ∈ {Rent, COL, Commute, AQI, Safety, Lifestyle}, collect the raw value per locality, then:

- **Cost-like (Rent, COL, Commute, AQI):**  `Score = (max − x) / (max − min) × 100`
- **Benefit-like (Safety, Lifestyle):**  `Score = (x − min) / (max − min) × 100`
- **Composite:**  `Index(i) = Σ W_D · Score_D(i)`  over all six dimensions
- **Rank** all 15 localities; surface top-3 per persona.
- **Verdict tags:** Excellent ≥ 70 · Good 55–69 · Average 40–54 · Below Avg < 40

---

## 6. Persona recommender (5 profiles, each a weighted re-rank)

| Persona | Income (₹) | BHK | Work Hub | Priority |
|---|---|---|---|---|
| Student / Fresher | 25000 | 1BHK | Shivaji Nagar | Lowest rent + safety |
| Junior IT Professional | 55000 | 1BHK | Hinjewadi | Short commute + AQI |
| Senior IT Professional | 120000 | 2BHK | Kharadi | Lifestyle + safety |
| Family with Kids | 150000 | 3BHK | Shivaji Nagar | Schools + safety + parks |
| Remote Worker | 80000 | 2BHK | Hinjewadi | Air quality + cafés |

Each persona has its own weight distribution over the six dimensions; the engine returns the top-3 localities with reasons.

---

## 7. Current headline results (from the synthetic version — for reference only)

- Top locality: **Wakad (73.3)**, then Pimpri 68.3, Hinjewadi 66.7, Shivaji Nagar 63.9, Chinchwad 63.1.
- Cheapest rent: Pimpri (~₹13,158 1BHK). Priciest: Koregaon Park (~₹34,094).
- Best AQI: Aundh (annual ~102). Worst: Pimpri/PCMC (annual ~143).
- Reported finding: affordability ≠ cheapest rent; IT-hub proximity adds 18–25% rent; PCMC is cheap but has worse AQI.

These numbers come from simulated data and must be regenerated from real data in the rebuild.

---

## 8. Target outcome of the rebuild

A real-data, reproducible Python system that: pulls real public data for all six dimensions; reproduces the composite index AND validates it with established MCDM methods (TOPSIS, entropy weighting) + sensitivity analysis; adds machine learning (rent prediction, locality clustering, rent-trend forecasting); ships a Streamlit dashboard + publication-quality figures/tables; and documents the provenance of every data point. The author must be able to explain and defend every method in a viva and conference Q&A.
