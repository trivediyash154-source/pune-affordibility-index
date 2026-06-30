"""End-to-end pipeline for the Pune Seasonal Affordability-Livability Index.

Run all steps:        .venv/bin/python run_pipeline.py
Run specific steps:   .venv/bin/python run_pipeline.py --steps 1 2

Steps are added incrementally as the project is built.
"""
from __future__ import annotations

import argparse

from src.aqi import run_seasonal_for_all
from src.cluster import run_clustering
from src.features import amenities_table
from src.geo import commute_table
from src.index import run_seasonal_index
from src.ingest import available_stations, load_rentals_pune
from src.mcda import run_mcda
from src.recommend import all_personas, persona_season_matrix
from src.sensitivity import monte_carlo
from src.viz import run_eda
from src.models import evaluate_models, shap_analysis
from src.preprocess import select_study_localities
from src.rent import clean_rentals, locality_rent_table
from src.utils import get_logger, load_config, rel, save_table, set_seed

log = get_logger("pipeline")


def step1_study_units(cfg: dict):
    """STEP 1 — define real, data-driven study localities."""
    log.info("=== STEP 1: study-unit selection ===")
    pune = load_rentals_pune(cfg)
    study = select_study_localities(pune, cfg["study"]["min_listings"])

    # AQI station assignment. With one station every locality maps to it
    # (flagged proxy); refined to true nearest-station once geocoding + more
    # stations exist. nearby_localities marks the genuinely-close ones.
    stations = available_stations(cfg)
    
    # Build locality -> station mapping
    loc_to_station = {}
    for s in stations:
        for loc in cfg["aqi"]["stations"][s].get("nearby_localities", []):
            loc_to_station[loc.lower()] = s
            
    def assign_station(loc):
        loc_lower = loc.lower()
        if loc_lower in loc_to_station:
            return loc_to_station[loc_lower]
        try:
            import pandas as pd
            geo = pd.read_csv("data/processed/geocoded.csv")
            station_coords = {}
            for st in stations:
                for st_loc in cfg["aqi"]["stations"][st].get("nearby_localities", []):
                    match = geo[geo["place"].str.lower() == st_loc.lower()]
                    if not match.empty:
                        station_coords[st] = (match.iloc[0]["lat"], match.iloc[0]["lon"])
                        break
            loc_match = geo[geo["place"].str.lower() == loc_lower]
            if not loc_match.empty and station_coords:
                loc_lat, loc_lon = loc_match.iloc[0]["lat"], loc_match.iloc[0]["lon"]
                min_dist, nearest_st = float('inf'), None
                for st, (slat, slon) in station_coords.items():
                    dist = (loc_lat - slat)**2 + (loc_lon - slon)**2
                    if dist < min_dist:
                        min_dist, nearest_st = dist, st
                if nearest_st: return nearest_st
        except Exception:
            pass
        return stations[0] if stations else None

    study["aqi_station"] = study["locality"].apply(assign_station)
    study["aqi_station_nearby"] = study["locality"].apply(lambda x: x.lower() in loc_to_station)
    study["aqi_is_proxy"] = ~study["aqi_station_nearby"]

    path = save_table(study, "study_localities")
    log.info("wrote %s", path)
    log.info("stations available: %s", stations)
    log.info("localities genuinely near a station: %s",
             list(study.loc[study["aqi_station_nearby"], "locality"]))
    print("\n--- STEP 1 study localities (>=%d listings) ---" % cfg["study"]["min_listings"])
    print(study.to_string(index=False))
    return study


def step2_rent(cfg: dict):
    """STEP 2 — clean rentals, aggregate per locality, ML rent model + SHAP."""
    log.info("=== STEP 2: rent dimension ===")
    pune = load_rentals_pune(cfg)
    study = select_study_localities(pune, cfg["study"]["min_listings"])
    clean = clean_rentals(pune, study)

    rent_tbl = locality_rent_table(clean)
    print("\n--- per-locality rent (cheapest 8) ---")
    print(rent_tbl[["locality", "n_listings", "median_rent",
                    "median_rent_per_sqft"]].head(8).to_string(index=False))

    results = evaluate_models(clean)
    print("\n--- rent model comparison (5-fold CV, metrics in INR) ---")
    print(results.to_string(index=False))

    shap_analysis(clean, model_name="XGBoost")
    return clean, rent_tbl, results


def step3_aqi(cfg: dict):
    """STEP 3 — CPCB AQI + seasonal split for every available station."""
    log.info("=== STEP 3: seasonal AQI ===")
    stations = available_stations(cfg)
    seasonal = run_seasonal_for_all(cfg, stations)
    print("\n--- seasonal AQI by station ---")
    print(seasonal.to_string(index=False))
    return seasonal


def step4_index(cfg: dict):
    """STEP 4 — assemble dimensions, composite index per season."""
    log.info("=== STEP 4: seasonal composite index ===")
    pune = load_rentals_pune(cfg)
    study = select_study_localities(pune, cfg["study"]["min_listings"])
    commute_table(study, cfg["work_hubs"])      # cached
    amenities_table(study)                       # cached
    results = run_seasonal_index(cfg)
    winter = results["Winter"]
    cols = ["rank", "locality", "index", "verdict", "score_rent",
            "score_commute", "score_lifestyle", "score_aqi"]
    print("\n--- composite index (Winter) — top 10 ---")
    print(winter[cols].head(10).to_string(index=False))
    return results


def step5_rigor(cfg: dict):
    """STEP 5 — entropy weights, TOPSIS, Monte-Carlo sensitivity, Pareto."""
    log.info("=== STEP 5: research rigor ===")
    mcda = run_mcda(cfg, season="Winter")
    print("\n--- MCDA rankings (top 8) ---")
    print(mcda.reset_index()[["locality", "rank_subjective", "rank_entropy",
                              "rank_topsis"]].head(8).to_string(index=False))
    sens = monte_carlo(cfg, season="Winter", n=10000)
    print("\n--- rank stability (top 8) ---")
    print(sens[["locality", "mean_rank", "p_top3", "p_top5"]].head(8).to_string(index=False))
    return mcda, sens


def step6_recommend(cfg: dict):
    """STEP 6 — transparent persona recommender (top-3 per persona + season matrix)."""
    log.info("=== STEP 6: persona recommender ===")
    recs = all_personas(cfg, season="Winter")
    persona_season_matrix(cfg)
    print("\n--- persona recommendations (Winter) ---")
    print(recs.to_string(index=False))
    
    # Calculate Spearman rank correlation for student_fresher (Monsoon vs Winter)
    try:
        from src.recommend import rank_for_weights, persona_weights
        from scipy.stats import spearmanr
        w = persona_weights(cfg, "student_fresher")
        _, idx_monsoon = rank_for_weights(cfg, w, "Monsoon")
        _, idx_winter = rank_for_weights(cfg, w, "Winter")
        
        # We need the ranks for the localities in the exact same order
        ranks_m = idx_monsoon.rank(ascending=False, method='min')
        ranks_w = idx_winter.rank(ascending=False, method='min')
        df_ranks = pd.DataFrame({"M": ranks_m, "W": ranks_w}).dropna()
        rho, _ = spearmanr(df_ranks["M"], df_ranks["W"])
        print(f"\nREQUIRED: Spearman rank correlation (Monsoon vs Winter) for student_fresher = {rho:.4f}")
    except Exception as e:
        log.error("Failed to compute Spearman: %s", e)
        
    return recs


def step7_cluster(cfg: dict):
    """STEP 7 — unsupervised tiering (K-Means + hierarchical)."""
    log.info("=== STEP 7: clustering / tiering ===")
    clusters = run_clustering(cfg, season="Winter")
    print("\n--- locality tiers ---")
    print(clusters[["locality", "tier", "kmeans_cluster", "hier_cluster"]].to_string(index=False))
    return clusters


def step8_eda(cfg: dict):
    """STEP 8 — exploratory paper figures."""
    log.info("=== STEP 8: EDA figures ===")
    run_eda(cfg)


STEPS = {1: step1_study_units, 2: step2_rent, 3: step3_aqi,
         4: step4_index, 5: step5_rigor, 6: step6_recommend,
         7: step7_cluster, 8: step8_eda}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--steps", nargs="*", type=int, default=sorted(STEPS),
                        help="which steps to run (default: all available)")
    args = parser.parse_args()

    cfg = load_config()
    set_seed(cfg["project"]["seed"])
    for s in args.steps:
        if s in STEPS:
            STEPS[s](cfg)
        else:
            log.warning("step %s not implemented yet", s)

    # finalize: mirror the data dictionary into outputs/tables/ for the paper
    import shutil
    src = rel("data/processed/data_dictionary.csv")
    if src.exists():
        shutil.copy(src, rel("outputs/tables/data_dictionary.csv"))
        log.info("data_dictionary mirrored to outputs/tables/")


if __name__ == "__main__":
    main()
