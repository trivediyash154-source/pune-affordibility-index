# Pune Index: A Dynamic Urban Livability Assessment Framework

## 1. What is this Project?

The **Pune Index** is a data-driven, highly customizable urban livability index initially focused on Pune, India. Traditional livability indices (like the EIU Global Livability Index) offer a "one-size-fits-all" ranking that doesn't reflect the real-world constraints of different demographics. A fresh college graduate has vastly different priorities (e.g., cheap rent, nightlife, basic safety) compared to a senior IT professional with a family (e.g., large apartments, proximity to good schools, air quality). 

This project solves this by using a **Hybrid Multiple Criteria Decision Analysis (MCDA)** approach. It evaluates 27 distinct localities in Pune across 6 critical dimensions: **Rent, Cost of Living, Commute, Air Quality Index (AQI), Safety, and Lifestyle**. It uses predefined "Personas" to subjectively weigh these dimensions, combined with objective mathematical weighting (Shannon Entropy) and ranks them using TOPSIS (Technique for Order of Preference by Similarity to Ideal Solution). 

The result is a dynamic, user-centric web platform where users can explore how their personal priorities and seasonal changes (like monsoon vs. winter smog) affect where they should live.

---

## 2. What We Have Done Till Now (In Detailed Technical Depth)

### Data Engineering & Pipeline (`/src` & `run_pipeline.py`)
- **Data Scraping & Cleaning:** Collected raw data for 27 Pune localities, covering 1-BHK to 3-BHK median rents, commuting distances to major IT hubs (Hinjewadi, Kharadi, etc.), and scraping amenity counts (cafes, hospitals, schools) from mapping APIs.
- **Geocoding & Spatial Mapping:** Used geocoding APIs (Nominatim) to convert locality names to exact Latitude/Longitude coordinates (`geocoded.csv`).
- **Granular AQI Processing:** Processed massive temporal AQI datasets from 9 distinct MPCB/IITM air quality monitoring stations in Pune (2024-25 data).
- **Spatial Nearest-Neighbor Matching:** Developed an algorithm in the pipeline that computes the Euclidean distance between a locality's coordinates and the 9 AQI stations, automatically assigning each locality to its most accurate localized air quality sensor.
- **Seasonal AQI Modeling:** Modeled AQI dynamically based on Indian seasons (Monsoon, Summer, Winter), as air quality drastically changes ranking outcomes across seasons.

### The Mathematical Engine (MCDA)
- **Subjective Persona Modeling:** Created distinct mathematical profiles (e.g., "Junior IT", "Family with Kids", "Remote Worker"). Each persona assigns a specific percentage weight to the 6 dimensions based on sociological and economic constraints.
- **Shannon Entropy Weighting:** Added an objective layer to prevent bias. The system calculates the dispersion of data (Shannon Entropy). If a dimension (like Cost of Living) has very little variance across Pune, the algorithm automatically reduces its weight so it doesn't artificially skew the rankings.
- **TOPSIS Algorithm:** Implemented TOPSIS to calculate the geometric distance of every locality to the "Positive Ideal Solution" (the hypothetical perfect locality) and the "Negative Ideal Solution" (the worst possible locality). 
- **Monte Carlo Sensitivity Analysis:** Realizing that human weights are imperfect, we implemented a Monte Carlo simulation. It runs the ranking algorithm thousands of times while adding random noise (variance) to the persona weights. This outputs a "Rank Stability" metric, proving which localities are mathematically robust choices and which are highly volatile.

### The Full-Stack Frontend (`/frontend` - Next.js)
- **Interactive Dashboard:** Built a highly polished, responsive Next.js web application utilizing Tailwind CSS, Framer Motion for micro-animations, and Recharts for data visualization.
- **Real-Time AQI Integration:** Implemented a live API hook that fetches the current, up-to-the-minute AQI from the global WAQI network and displays it via a glowing "Live Feed" banner.
- **Dynamic Theme System:** Built a fully custom CSS-variable based theming engine supporting Light and Dark modes.
- **Persona & Weight Sliders:** Built an interactive UI where users can see pre-calculated persona rankings, but also drag sliders to dynamically recalculate the TOPSIS index in real-time in the browser.

---

## 3. What Needs to be Done to Get Selected at IEEE NIT Surat

While the software engineering and current MCDA framework are very strong, **IEEE conferences require a novel mathematical, computational, or algorithmic contribution.** Simply applying standard TOPSIS to Pune is generally considered an "Application Paper" and risks rejection if the review committee is strict. 

To guarantee acceptance at a reputed IEEE conference like those hosted at NIT Surat, we must elevate the project from an "Application" to an **"Algorithmic Innovation."**

Here is the exact roadmap of what we must add to the paper and the codebase:

### Upgrade 1: Implement "Stochastic Fuzzy TOPSIS" (The Math Innovation)
Instead of a persona having a fixed, crisp weight (e.g., Rent = 30%), human decision-making is naturally vague. 
**Action Item:** We need to update `src/mcda.py` to use **Triangular Fuzzy Numbers (TFNs)**. Rent importance will become a fuzzy range `[20%, 30%, 40%]`. We will write a custom Monte Carlo simulator that samples these fuzzy distributions 10,000 times to output a **Probabilistic Rank** (e.g., "Wadgaon Sheri has an 82% probability of being Rank #1"). 
*Why it works:* This solves a real academic gap: handling extreme subjective uncertainty in urban planning models.

### Upgrade 2: Spatial Interpolation (GIS Innovation)
Currently, a locality is simply mapped to the "closest" of the 9 AQI stations. Air pollution doesn't work like that; it disperses.
**Action Item:** We will implement **Kriging** or **Inverse Distance Weighting (IDW)** in Python. This will generate a continuous, mathematical heat-map surface of air quality across Pune, allowing us to estimate the exact AQI at a locality's precise latitude/longitude, rather than just borrowing the sensor's raw number.
*Why it works:* IEEE highly values advanced Geospatial (GIS) algorithms and computational spatial modeling.

### Upgrade 3: Drafting the Academic Paper (The Narrative)
We need to write the paper in the strict IEEE double-column format.
- **Title:** *A Stochastic Fuzzy-MCDA Framework for Urban Livability Assessment: A Case Study of Pune*
- **Introduction:** Highlight the gap that current indices (like EIU) are deterministic and fail to account for high-variance human uncertainty.
- **Methodology:** Provide the exact mathematical formulas for the Fuzzy TOPSIS and the Monte Carlo sampling. 
- **Results:** Show graphs demonstrating how our proposed "Fuzzy" method prevents risky locality choices compared to the standard, outdated TOPSIS method.

**Conclusion:** By adding the **Fuzzy Mathematics** and **Spatial Interpolation (Kriging)**, the project transforms from a "Web App that uses MCDA" into a "Novel Computational Framework for Smart Cities." This is exactly what the reviewers at IEEE NIT Surat will be looking for.
