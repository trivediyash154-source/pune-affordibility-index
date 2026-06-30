"""Streamlit dashboard — Pune Seasonal Affordability-Livability Index.

Run:  .venv/bin/streamlit run app/streamlit_app.py
Features: season selector, persona selector, ranking table, AQI chart, map.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# make the `src` package importable when launched via `streamlit run`
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.recommend import rank_for_weights, recommend          # noqa: E402
from src.utils import load_config, rel                          # noqa: E402

st.set_page_config(page_title="Pune Affordability Index", layout="wide")
cfg = load_config()
SEASONS = list(cfg["seasons"])


@st.cache_data
def load_tables():
    geo = pd.read_csv(rel("data/processed/geocoded.csv"))
    aqi = pd.read_csv(rel("outputs/tables/aqi_seasonal.csv"))
    rent = pd.read_csv(rel("outputs/tables/locality_rent.csv"))
    return geo, aqi, rent


geo, aqi_seasonal, rent_tbl = load_tables()

st.title("🏙️ Pune Seasonal Affordability–Livability Index")
st.caption("Real data · MagicBricks rents · MPCB air quality · OSM amenities · "
           "transparent MCDA. See outputs/methodology.md for methods & limitations.")

# ---- sidebar ----
season = st.sidebar.selectbox("Season", SEASONS, index=SEASONS.index("Winter"))
persona_opts = {"Default (equal-to-spec weights)": None}
persona_opts.update({p["label"]: k for k, p in cfg["personas"].items()})
persona_label = st.sidebar.selectbox("Persona", list(persona_opts))
persona_key = persona_opts[persona_label]

if persona_key:
    weights = pd.Series(cfg["personas"][persona_key]["weights"])
    st.sidebar.write("**Priority:**", cfg["personas"][persona_key]["priority"])
else:
    weights = pd.Series({d: cfg["dimensions"][d]["weight"] for d in cfg["dimensions"]})
st.sidebar.write("**Weights**")
st.sidebar.dataframe(weights.rename("weight").to_frame(), use_container_width=True)

# ---- compute ranking ----
M, idx = rank_for_weights(cfg, weights, season)
rank = idx.rename("index").to_frame()
rank["rank"] = rank["index"].rank(ascending=False, method="min").astype(int)
rank = rank.reset_index().rename(columns={"locality": "locality"})

# ---- KPIs ----
c1, c2, c3 = st.columns(3)
top = rank.iloc[0]
c1.metric("Top locality", top["locality"], f"index {top['index']:.1f}")
cheapest = rent_tbl.sort_values("median_rent").iloc[0]
c2.metric("Cheapest rent", cheapest["locality"], f"₹{cheapest['median_rent']:,.0f}/mo")
season_aqi = aqi_seasonal[aqi_seasonal["season"] == season]
if not season_aqi.empty:
    c3.metric(f"AQI ({season})", f"{season_aqi['mean_aqi'].mean():.0f}",
              season_aqi["category"].iloc[0])

left, right = st.columns([1.1, 1])

with left:
    st.subheader(f"Ranking — {season}")
    st.dataframe(rank[["rank", "locality", "index"]].head(15),
                 use_container_width=True, hide_index=True)
    if persona_key:
        st.subheader(f"Top picks for: {persona_label}")
        st.dataframe(recommend(cfg, persona_key, season), use_container_width=True, hide_index=True)

with right:
    st.subheader("Map (colour = index)")
    try:
        import folium
        from streamlit.components.v1 import html

        merged = rank.merge(geo, left_on="locality", right_on="place", how="left").dropna(subset=["lat"])
        m = folium.Map(location=[18.52, 73.86], zoom_start=11, tiles="cartodbpositron")
        for _, r in merged.iterrows():
            val = r["index"]
            color = "#1a9850" if val >= 60 else "#fee08b" if val >= 50 else "#d73027"
            folium.CircleMarker(
                [r["lat"], r["lon"]], radius=6 + val / 12, color=color, fill=True,
                fill_opacity=0.8,
                popup=f"{r['locality']}: {val:.1f} (rank {int(r['rank'])})",
            ).add_to(m)
        html(m._repr_html_(), height=460)
    except Exception as e:
        st.info(f"Map unavailable: {e}")

st.subheader("Seasonal air quality (Katraj)")
st.bar_chart(aqi_seasonal.set_index("season")["mean_aqi"].reindex(["Summer", "Monsoon", "Winter"]))
