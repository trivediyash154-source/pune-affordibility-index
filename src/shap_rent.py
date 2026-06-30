"""Module: shap_rent — SHAP attribution for the rent model (legitimate: 928 rows).

The rent model is Linear Regression on the cleaned MagicBricks listings (~928 rows,
not 27) — so SHAP is statistically valid here. We load models/rent_model.pkl if it
exists, else retrain from the real listings and save it (pipeline STEP 2 does not
persist a model). KernelExplainer is used (model-agnostic, works on the sklearn
pipeline), per the project spec.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .ingest import load_rentals_pune
from .models import CATEGORICAL, NUMERIC, TARGET, _make_preprocessor
from .preprocess import select_study_localities
from .rent import clean_rentals
from .utils import get_logger, load_config, rel, save_fig, save_table

log = get_logger("shap_rent")
SEED = 42
PKL = rel("models", "rent_model.pkl")


def _build_training_data(cfg: dict):
    pune = load_rentals_pune(cfg)
    study = select_study_localities(pune, cfg["study"]["min_listings"])
    clean = clean_rentals(pune, study)
    X = clean[NUMERIC + CATEGORICAL]
    y = np.log1p(clean[TARGET].to_numpy(dtype=float))
    return X, y


def load_or_train(cfg: dict):
    """Return (model, X_transformed, feature_names). Trains + saves if no pkl."""
    import joblib
    from sklearn.linear_model import LinearRegression

    X, y = _build_training_data(cfg)
    prep = _make_preprocessor(scale_numeric=True)
    Xt = prep.fit_transform(X)
    names = list(prep.get_feature_names_out())

    if PKL.exists():
        model = joblib.load(PKL)["model"]
        log.info("loaded model from %s", PKL)
    else:
        model = LinearRegression().fit(Xt, y)
        PKL.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "preprocessor": prep, "feature_names": names}, PKL)
        log.info("trained + saved rent model -> %s (n=%d, %d features)", PKL, Xt.shape[0], Xt.shape[1])
    return model, Xt, names


def run_shap(cfg: dict | None = None) -> dict:
    import shap
    from sklearn.model_selection import train_test_split

    cfg = cfg or load_config()
    model, Xt, names = load_or_train(cfg)

    Xtr, Xte = train_test_split(Xt, test_size=0.25, random_state=SEED)
    background = shap.sample(Xtr, 100, random_state=SEED)
    X_explain = shap.sample(Xte, 100, random_state=SEED)
    explainer = shap.KernelExplainer(model.predict, background)
    shap_values = explainer.shap_values(X_explain, nsamples=200)

    imp = (pd.DataFrame({"feature": names, "mean_abs_shap": np.abs(shap_values).mean(0)})
           .sort_values("mean_abs_shap", ascending=False).reset_index(drop=True))
    imp["rank"] = imp.index + 1
    save_table(imp, "shap_feature_importance")

    # figure: top-10 mean|SHAP|
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    top = imp.head(10).iloc[::-1]
    fig, ax = plt.subplots(figsize=(7.5, 5))
    ax.barh(top["feature"], top["mean_abs_shap"], color="#C17F00")
    ax.set_xlabel("mean |SHAP value|  (impact on log-rent)")
    ax.set_title("Rent drivers — SHAP importance (Linear model, KernelExplainer)")
    save_fig(fig, "shap_rent_importance")
    plt.close(fig)

    # finding: location vs size
    area = float(imp.loc[imp["feature"] == "num__area", "mean_abs_shap"].sum())
    loc_mask = imp["feature"].str.contains("locality")
    loc_sum = float(imp.loc[loc_mask, "mean_abs_shap"].sum())
    loc_max = float(imp.loc[loc_mask, "mean_abs_shap"].max()) if loc_mask.any() else 0.0
    top_feat = imp.iloc[0]

    print("\n=== SHAP — top 5 rent drivers (mean |SHAP|) ===")
    for _, r in imp.head(5).iterrows():
        print(f"  {r['rank']}. {r['feature']:<28} {r['mean_abs_shap']:.4f}")
    print(f"\nTop driver of rent: {top_feat['feature']} (mean |SHAP| = {top_feat['mean_abs_shap']:.4f})")
    print(f"area mean|SHAP| = {area:.4f} | locality (sum) = {loc_sum:.4f} | locality (max single) = {loc_max:.4f}")
    if loc_sum > area:
        print("Location premium dominates — WHERE you live matters more than flat size (aggregate locality effect).")
    else:
        print("Size dominates — flat area matters more than location in the Pune market.")

    return {"top_feature": str(top_feat["feature"]), "top_value": float(top_feat["mean_abs_shap"]),
            "area_shap": area, "locality_shap_sum": loc_sum}
