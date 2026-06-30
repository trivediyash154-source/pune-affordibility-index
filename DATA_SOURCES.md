# Real Data Sources — Pune Affordability Index
# Every link below is real, confirmed, and publicly accessible. No login required unless noted.
# Claude Code: read this file and follow the download instructions for each dimension.

---

## DIMENSION 1 — RENT / HOUSING PRICES

### Source A — Maharashtra Government Ready Reckoner Rates (MOST AUTHORITATIVE)
- What: Official per-sq-ft property valuation rates published by Maharashtra state govt (IGR)
- Why citable: Government of Maharashtra, IGR (Inspector General of Registration)
- URL: https://igrmaharashtra.gov.in/eASR/eASRCommon.aspx
- Status: READ FROM pune_rr_rates.csv IN THIS FOLDER (pre-compiled from published 2024 rates)
- License: Public government data

### Source B — India House Rent Dataset (GitHub mirror, no login)
- What: 4746 rows of real Indian rental listings — BHK, Rent, Size, Furnishing, Locality, City
- Direct raw CSV: https://raw.githubusercontent.com/Athulyachandran/House-Rent-Dataset-Analysis/main/House_Rent_Dataset.csv
- IMPORTANT: This dataset covers Kolkata, Mumbai, Bangalore, Delhi, Chennai, Hyderabad — NOT Pune
- Use for: training ML rent-prediction model architecture; apply learned coefficients to Pune
- Columns: Posted On, BHK, Rent, Size, Floor, Area Type, Area Locality, City, Furnishing Status, Tenant Preferred, Bathroom, Point of Contact
- License: Public / Kaggle CC

### Source C — Kaggle Pune-specific datasets (requires Kaggle login — manual download)
- Rental price of India's IT Capital – Pune: https://www.kaggle.com/datasets/anantsakhare/rental-price-of-indias-it-capital-pune-mh-ind
- Pune House Rent Prediction: https://www.kaggle.com/datasets/rahulmishra5/pune-house-rent-prediction
- Pune House Data: https://www.kaggle.com/datasets/saipavansaketh/pune-house-data
- Instructions: download CSV manually, place in data/raw/, filename pune_rent_kaggle.csv
- If Kaggle not available: use Source A (RR rates) + Source B architecture

### Source D — NHB RESIDEX (city-level official index)
- URL: https://residex.nhbonline.org.in/ and https://www.nhb.org.in/data-graphs/
- What: Quarterly housing price index for Pune (zone-level, not locality-level)
- Use for: time-series validation, trend analysis, not per-locality raw rent

---

## DIMENSION 4 — AIR QUALITY (AQI)

### Source: OpenCity / CPCB — Pune Hourly AQI Reports
- Main page: https://data.opencity.in/dataset/pune-hourly-air-quality-reports
- License: Public Domain (CPCB data)
- NOTE: Direct CSV downloads require a browser session. Download manually by visiting the
  direct download link in a browser, OR use the requests library with session cookies.

### The 10 stations + direct download URLs:

| Station | Download URL |
|---|---|
| Alandi IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/38290549-5b3d-4778-a916-029c70d88254/download/a9407013-dba4-48fe-afda-bb951f4f3cfe.csv |
| Bhosari IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/15d82ada-9e8f-474c-93b7-f0f616295bad/download/6c9be432-4a82-4661-972f-e4ac9be0d252.csv |
| Hadapsar IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/c5659bc4-bbcf-4a35-84b9-4f5e8270c8f5/download/5ec1c512-c3f1-4ef6-81eb-4a5147241377.csv |
| Karve Road MPCB (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/a00761c0-a1a7-4513-b58b-2f940b8b64ff/download/f421cdb4-57de-42ad-bd16-0bfd54e79cae.csv |
| MIT-Kothrud IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/98aad25d-5975-4afc-8c01-e96abb2ce9bc/download/7ac0c4c7-01a3-4311-8617-41a0b1cf03d9.csv |
| Mhada Colony IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/34d740b6-8912-4df8-907d-d782e1f0aafa/download/697e0d85-930c-4990-972f-1ad9eac2db05.csv |
| Revenue Colony–Shivajinagar IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/cccbaca5-350c-4725-8a80-a4431c71caf6/download/fbf99e33-887b-4a97-8861-fe44d24cb48a.csv |
| Transport Nagar–Nigdi IITM (2017–2023) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/64cfe8b6-edff-446a-8083-d27fa5b9269f/download/3db44ac9-ef90-41c4-b915-ff751de81679.csv |
| Bhumkar Nagar IITM (2024–25) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/7cc44628-08e5-40d3-b323-4e6246f5d868/download/pune-bhumkar-nagar-iitm-2024-25.csv |
| Panchawati Pashan IITM (2024–25) | https://data.opencity.in/dataset/b16b4972-1d7e-4b7e-b1d6-23228cc63c83/resource/da12ee9d-21bf-4f5d-98d4-052b3a85c216/download/pune-panchawati_pashan-iitm-2024-25.csv |

### Station → Locality Mapping (nearest-station proxy, fully documented)

| Locality | Assigned Station | Basis |
|---|---|---|
| Kothrud | MIT-Kothrud IITM | Same area, ~0.5 km |
| Deccan | MIT-Kothrud IITM | ~2 km, closest west-central |
| Kharadi | Hadapsar IITM | ~4 km east, closest east station |
| Hadapsar | Hadapsar IITM | Same area |
| Magarpatta | Hadapsar IITM | ~2 km, same east corridor |
| Viman Nagar | Hadapsar IITM | ~3 km northeast |
| Shivaji Nagar | Revenue Colony–Shivajinagar IITM | Same area |
| Camp | Revenue Colony–Shivajinagar IITM | ~1.5 km central |
| Koregaon Park | Revenue Colony–Shivajinagar IITM | ~2 km east-central |
| Aundh | Panchawati Pashan IITM | ~2 km, closest north-west |
| Baner | Panchawati Pashan IITM | ~3 km |
| Hinjewadi | Mhada Colony IITM | ~6 km, closest west |
| Wakad | Bhumkar Nagar IITM | ~3 km west |
| Pimpri | Transport Nagar–Nigdi IITM | ~4 km PCMC area |
| Chinchwad | Transport Nagar–Nigdi IITM | ~2 km PCMC area |

NOTE: Stations covering 2017–2023 are preferred (more data). Bhumkar Nagar and Panchawati
Pashan only have 2024–25 data — if using 2017–23 for those localities, fall back to the
nearest 2017–23 station (Mhada Colony for Wakad; MIT-Kothrud for Aundh/Baner).

### Fallback: AQICN API (no manual download needed, requires free token)
- Get token: https://aqicn.org/api/
- Pune station H3760: https://api.waqi.info/feed/@H3760/?token=YOUR_TOKEN
- Returns: current + recent AQI as JSON

---

## DIMENSIONS 5 & 6 — SAFETY & AMENITIES (OSM-based, fully autonomous)

### Source: OpenStreetMap via osmnx + Overpass API
- No login, no API key, no cost
- What to query per locality:
  - hospitals (amenity=hospital)
  - schools (amenity=school)
  - police stations (amenity=police) ← safety proxy
  - shopping malls (shop=mall)
  - parks (leisure=park)
  - cafes (amenity=cafe)
  - bus stops / metro stations (public_transport=station)
- Python: pip install osmnx geopy
- Claude Code can do this fully autonomously in src/geo.py

---

## DIMENSIONS 2 & 3 — COST OF LIVING & COMMUTE

### Cost of Living
- Numbeo Pune 2024 (city-level, freely readable): https://www.numbeo.com/cost-of-living/in/Pune
- Use as a Pune-wide baseline; apply locality-level multipliers based on posh factor
- Cite as: "Numbeo Cost of Living in Pune 2024, accessed [date]"

### Commute
- Google Maps Distance Matrix API: requires a key; free tier = 10,000 requests/month
  Apply at: https://console.cloud.google.com → Maps → Distance Matrix API
- Alternative (no key): osmnx network routing — compute drive time on the road graph
  This is fully autonomous and produces documented, reproducible results

---

## HOW CLAUDE CODE SHOULD USE THIS FILE

1. Start with AQI: instruct the user to manually download the 7 station CSVs listed above
   (or attempt requests session download) → save to data/raw/aqi/
2. Fetch India rent CSV autonomously from GitHub URL above → data/raw/india_rent.csv
3. Read pune_rr_rates.csv from this folder → data/raw/pune_rr_rates.csv
4. Run osmnx queries for amenities + safety per locality → data/raw/osm_amenities.csv
5. Read Numbeo cost-of-living figures for Pune baseline
6. All sources → data/processed/ with data_dictionary.csv recording every provenance
