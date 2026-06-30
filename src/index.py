"""Module: index — min-max normalisation + weighted composite, per season (STEP 4).

Reproduces the original Excel formula exactly:
  cost dim     -> score = (max - x) / (max - min) * 100   (lower is better)
  benefit dim  -> score = (x - min) / (max - min) * 100   (higher is better)
  composite    -> index = sum_d  weight_d * score_d
The index is computed once PER SEASON; only the AQI indicator changes by season,
so any ranking shift between seasons is attributable to seasonal air quality.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from .utils import get_logger, load_config, record_provenance, rel, save_fig, save_table

log = get_logger("index")

# index dimension -> raw indicator column
RAW_COL = {"rent": "median_rent", "col": "col", "commute": "commute_min",
           "aqi": "aqi", "safety": "safety_raw", "lifestyle": "lifestyle_raw"}


def minmax(series: pd.Series, direction: str) -> pd.Series:
    """0-100 min-max. Zero-range (all equal) -> neutral 50 (non-discriminating)."""
    x = series.astype(float)
    lo, hi = x.min(), x.max()
    if np.isclose(hi, lo):
        return pd.Series(50.0, index=series.index)
    return ((hi - x) if direction == "cost" else (x - lo)) / (hi - lo) * 100.0


def verdict(value: float, cfg: dict) -> str:
    for band in cfg["verdict_bands"]:
        if value >= band["min"]:
            return band["label"]
    return cfg["verdict_bands"][-1]["label"]


def assemble_indicators(cfg: dict) -> pd.DataFrame:
    """Merge per-locality raw indicators (everything except season-varying AQI)."""
    rent = pd.read_csv(rel("outputs/tables/locality_rent.csv"))[["locality", "median_rent"]]
    commute = pd.read_csv(rel("data/processed/commute.csv"))[["locality", "commute_min"]]
    amen = pd.read_csv(rel("data/processed/amenities.csv"))[["locality", "safety_raw", "lifestyle_raw"]]
    study = pd.read_csv(rel("outputs/tables/study_localities.csv"))[["locality", "aqi_station"]]
    df = (study.merge(rent, on="locality").merge(commute, on="locality")
                .merge(amen, on="locality"))
    df["col"] = cfg["cost_of_living"]["city_baseline_inr"]  # constant (disclosed)
    record_provenance([{
        "field": "col", "table": "indicators", "dimension": "col",
        "source_name": cfg["cost_of_living"]["source"], "source_url": cfg["cost_of_living"]["url"],
        "license": "Numbeo terms", "transform": "city-level monthly cost baseline (constant)",
        "is_proxy": True, "caveat": "city-level only -> non-discriminating across localities",
    }])
    return df


def composite_for_season(base: pd.DataFrame, aqi_seasonal: pd.DataFrame,
                         season: str, cfg: dict) -> pd.DataFrame:
    """Compute the 0-100 composite for one season."""
    df = base.copy()
    amap = aqi_seasonal[aqi_seasonal["season"] == season].set_index("station")["mean_aqi"]
    df["aqi"] = df["aqi_station"].map(amap)

    dims = cfg["dimensions"]
    for d, meta in dims.items():
        df[f"score_{d}"] = minmax(df[RAW_COL[d]], meta["direction"]).round(1)
    df["index"] = sum(df[f"score_{d}"] * dims[d]["weight"] for d in dims).round(1)
    df["rank"] = df["index"].rank(ascending=False, method="min").astype(int)
    df["verdict"] = df["index"].apply(lambda v: verdict(v, cfg))
    df["season"] = season
    return df.sort_values("index", ascending=False).reset_index(drop=True)


def run_seasonal_index(cfg: dict | None = None) -> dict[str, pd.DataFrame]:
    """Compute the index for every season; save per-season + wide tables; report
    seasonal ranking stability via Spearman."""
    cfg = cfg or load_config()
    base = assemble_indicators(cfg)
    aqi_seasonal = pd.read_csv(rel("outputs/tables/aqi_seasonal.csv"))

    results = {s: composite_for_season(base, aqi_seasonal, s, cfg) for s in cfg["seasons"]}

    long = pd.concat(results.values(), ignore_index=True)
    save_table(long, "index_by_season_long")
    wide = long.pivot(index="locality", columns="season", values="index")
    wide["rank_winter"] = wide["Winter"].rank(ascending=False, method="min").astype(int)
    wide = wide.sort_values("Winter", ascending=False)
    save_table(wide.reset_index(), "index_by_season_wide")

    # Generate aqi_station_mapping.csv (locality | station | monsoon_aqi | summer_aqi | winter_aqi)
    aqi_piv = aqi_seasonal.pivot(index="station", columns="season", values="mean_aqi")
    aqi_piv = aqi_piv.rename(columns={"Monsoon": "monsoon_aqi", "Summer": "summer_aqi", "Winter": "winter_aqi"})
    mapping = base[["locality", "aqi_station"]].drop_duplicates().merge(aqi_piv, left_on="aqi_station", right_index=True, how="left")
    save_table(mapping, "aqi_station_mapping")

    # CRITICAL DELIVERABLE: monsoon -> winter ranking shift table
    rank_piv = long.pivot(index="locality", columns="season", values="rank")
    shift = pd.DataFrame({
        "locality": rank_piv.index,
        "rank_monsoon": rank_piv["Monsoon"].astype(int),
        "rank_winter": rank_piv["Winter"].astype(int),
    })
    shift["rank_shift"] = shift["rank_monsoon"] - shift["rank_winter"]
    save_table(shift.sort_values("rank_winter").reset_index(drop=True), "seasonal_rank_shift")

    # seasonal ranking stability (Spearman on index between season pairs)
    seasons = list(cfg["seasons"])
    log.info("seasonal ranking stability (Spearman rho):")
    piv = long.pivot(index="locality", columns="season", values="index")
    for i in range(len(seasons)):
        for j in range(i + 1, len(seasons)):
            rho, _ = spearmanr(piv[seasons[i]], piv[seasons[j]])
            log.info("  %s vs %s: rho=%.4f", seasons[i], seasons[j], rho)

    full_composite_matrix(cfg, base, aqi_seasonal)   # 405-row locality x season x persona
    _fig_top10(results["Winter"])
    _fig_seasonal_heatmap(results, list(cfg["seasons"]))
    return results


def full_composite_matrix(cfg: dict, base: pd.DataFrame | None = None,
                          aqi_seasonal: pd.DataFrame | None = None) -> pd.DataFrame:
    """locality x season x persona composite table (27 x 3 x 5 = 405 rows)."""
    base = assemble_indicators(cfg) if base is None else base
    if aqi_seasonal is None:
        aqi_seasonal = pd.read_csv(rel("outputs/tables/aqi_seasonal.csv"))
    dims = list(cfg["dimensions"])
    frames = []
    for season in cfg["seasons"]:
        df = base.copy()
        amap = aqi_seasonal[aqi_seasonal["season"] == season].set_index("station")["mean_aqi"]
        df["aqi"] = df["aqi_station"].map(amap)
        scores = pd.DataFrame({d: minmax(df[RAW_COL[d]], cfg["dimensions"][d]["direction"]).values
                               for d in dims}, index=df["locality"].values)
        for _, p in cfg["personas"].items():
            w = p["weights"]
            comp = sum(scores[d] * w[d] for d in dims)
            sub = pd.DataFrame({"locality": scores.index, "season": season, "persona": p["label"]})
            for d in dims:
                sub[f"{d}_score"] = scores[d].round(1).values
            sub["composite_index"] = comp.round(1).values
            sub["rank"] = sub["composite_index"].rank(ascending=False, method="min").astype(int)
            sub["verdict"] = sub["composite_index"].apply(lambda v: verdict(v, cfg))
            frames.append(sub)
    out = pd.concat(frames, ignore_index=True)
    cols = (["locality", "season", "persona"] + [f"{d}_score" for d in dims]
            + ["composite_index", "rank", "verdict"])
    out = out[cols]
    save_table(out, "composite_index")
    log.info("composite_index.csv: %d rows (localities x seasons x personas)", len(out))
    return out


def _fig_top10(winter: pd.DataFrame) -> None:
    import matplotlib.pyplot as plt
    cmap = {"Excellent": "#1a9850", "Good": "#91cf60", "Average": "#fee08b", "Below Average": "#d73027"}
    d = winter.sort_values("index", ascending=False).head(10).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7.5, 5))
    ax.barh(d["locality"], d["index"], color=[cmap.get(v, "#999") for v in d["verdict"]])
    for y, (val, v) in enumerate(zip(d["index"], d["verdict"])):
        ax.text(val + 0.5, y, f"{val:.1f}", va="center", fontsize=9)
    ax.set_xlabel("Composite index (0-100)")
    ax.set_title("Top-10 localities by composite index (Winter, default weights)")
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in cmap.values()]
    ax.legend(handles, cmap.keys(), fontsize=8, loc="lower right")
    save_fig(fig, "top10_composite_index"); plt.close(fig)


def _fig_seasonal_heatmap(results: dict, seasons: list[str]) -> None:
    import matplotlib.pyplot as plt
    import numpy as np
    ranks = pd.DataFrame({s: results[s].set_index("locality")["rank"] for s in seasons})
    ranks = ranks.loc[results[seasons[-1]].set_index("locality").index]  # order by last season
    fig, ax = plt.subplots(figsize=(5.5, 8))
    im = ax.imshow(ranks.values, cmap="RdYlGn_r", aspect="auto")
    ax.set_xticks(range(len(seasons))); ax.set_xticklabels(seasons)
    ax.set_yticks(range(len(ranks))); ax.set_yticklabels(ranks.index, fontsize=8)
    for i in range(len(ranks)):
        for j in range(len(seasons)):
            ax.text(j, i, int(ranks.values[i, j]), ha="center", va="center", fontsize=7)
    ax.set_title("Locality rank by season\n(identical columns = no shift, single station)")
    fig.colorbar(im, ax=ax, label="rank (1=best)")
    save_fig(fig, "seasonal_ranking_heatmap"); plt.close(fig)
