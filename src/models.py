"""Module: models — supervised rent prediction + SHAP (STEP 2).

We predict per-listing monthly rent from structural features only
(area, beds, bathrooms, balconies, furnishing, locality). `area_rate` is
deliberately EXCLUDED: it equals rent/area and would leak the target.

Rent is right-skewed, so we model log1p(rent) and report metrics back in
rupees (R2/RMSE/MAE) under 5-fold cross-validation with a fixed seed.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .utils import get_logger, save_fig, save_table

log = get_logger("models")

NUMERIC = ["area", "beds", "bathrooms", "balconies"]
CATEGORICAL = ["furnishing", "locality"]
TARGET = "rent"
SEED = 42


def _make_preprocessor(scale_numeric: bool) -> ColumnTransformer:
    num = StandardScaler() if scale_numeric else "passthrough"
    return ColumnTransformer([
        ("num", num, NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
    ])


def _models() -> dict[str, tuple]:
    """name -> (estimator, needs_numeric_scaling)."""
    out = {
        "Linear Regression": (LinearRegression(), True),
        "Random Forest": (RandomForestRegressor(n_estimators=400, random_state=SEED, n_jobs=-1), False),
    }
    try:
        from xgboost import XGBRegressor
        out["XGBoost"] = (XGBRegressor(n_estimators=500, learning_rate=0.05, max_depth=5,
                                       subsample=0.9, colsample_bytree=0.9,
                                       random_state=SEED, n_jobs=-1), False)
    except Exception as e:  # pragma: no cover
        log.warning("XGBoost unavailable (%s); skipping", e)
    return out


def evaluate_models(df: pd.DataFrame) -> pd.DataFrame:
    """5-fold CV; rent metrics reported in rupees (log-target back-transformed)."""
    X = df[NUMERIC + CATEGORICAL]
    y = df[TARGET].to_numpy(dtype=float)
    y_log = np.log1p(y)
    kf = KFold(n_splits=5, shuffle=True, random_state=SEED)

    rows = []
    for name, (est, scale) in _models().items():
        r2s, rmses, maes = [], [], []
        for tr, te in kf.split(X):
            pipe = Pipeline([("prep", _make_preprocessor(scale)), ("model", est)])
            pipe.fit(X.iloc[tr], y_log[tr])
            pred = np.expm1(pipe.predict(X.iloc[te]))
            r2s.append(r2_score(y[te], pred))
            rmses.append(np.sqrt(mean_squared_error(y[te], pred)))
            maes.append(mean_absolute_error(y[te], pred))
        rows.append({
            "model": name,
            "R2_mean": np.mean(r2s), "R2_std": np.std(r2s),
            "RMSE_mean": np.mean(rmses), "RMSE_std": np.std(rmses),
            "MAE_mean": np.mean(maes), "MAE_std": np.std(maes),
        })
        log.info("%-18s R2=%.3f  RMSE=%.0f  MAE=%.0f", name,
                 rows[-1]["R2_mean"], rows[-1]["RMSE_mean"], rows[-1]["MAE_mean"])

    res = pd.DataFrame(rows).sort_values("R2_mean", ascending=False).reset_index(drop=True)
    for c in res.select_dtypes("float").columns:
        res[c] = res[c].round(3 if c.startswith("R2") else 0)
    save_table(res, "rent_model_comparison")
    return res


def shap_analysis(df: pd.DataFrame, model_name: str = "XGBoost") -> None:
    """Fit the best tree model on all data and save a SHAP importance plot."""
    import shap
    import matplotlib.pyplot as plt

    models = _models()
    if model_name not in models:
        model_name = "Random Forest"
    est, scale = models[model_name]

    X = df[NUMERIC + CATEGORICAL]
    y_log = np.log1p(df[TARGET].to_numpy(dtype=float))
    prep = _make_preprocessor(scale)
    Xt = prep.fit_transform(X)
    names = prep.get_feature_names_out()
    est.fit(Xt, y_log)

    explainer = shap.TreeExplainer(est)
    sv = explainer.shap_values(Xt)

    # mean |SHAP| bar (compact, publication-friendly)
    imp = pd.DataFrame({"feature": names, "mean_abs_shap": np.abs(sv).mean(0)}) \
        .sort_values("mean_abs_shap", ascending=False).head(15)
    save_table(imp, "rent_shap_importance")

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.barh(imp["feature"][::-1], imp["mean_abs_shap"][::-1], color="#2c7fb8")
    ax.set_xlabel("mean |SHAP value|  (impact on log-rent)")
    ax.set_title(f"Rent drivers — SHAP importance ({model_name})")
    save_fig(fig, "shap_rent_importance")
    plt.close(fig)
    log.info("SHAP top drivers: %s", list(imp["feature"].head(5)))
