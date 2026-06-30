"""Module: cluster — unsupervised tiering of localities (K-Means + hierarchical).

We group the 27 localities by their 0-100 dimension scores to reveal natural
"tiers" (e.g., affordable-peripheral vs premium-central). With only 27 points
this is EXPLORATORY/descriptive, not predictive — we say so in the paper and pick
k by silhouette rather than asserting a true cluster count.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

from .mcda import score_matrix
from .utils import get_logger, load_config, save_fig, save_table

log = get_logger("cluster")

# Cluster on the discriminating dimensions only (COL & AQI are flat -> no signal)
CLUSTER_DIMS = ["rent", "commute", "safety", "lifestyle"]


def choose_k(X: np.ndarray, k_range=range(2, 9), select_max: int = 5) -> tuple[int, pd.DataFrame]:
    """Pick k by best silhouette within an interpretable cap.

    Diagnostics are computed over the full range (for the elbow plot), but with
    only 27 localities we select k<=select_max (rule of thumb k<=sqrt(n/2)~3.7,
    relaxed to 5): silhouette is essentially flat beyond k=5, so a larger k
    over-segments without separating better.
    """
    rows = []
    for k in k_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
        rows.append({"k": k, "inertia": km.inertia_,
                     "silhouette": silhouette_score(X, km.labels_)})
    diag = pd.DataFrame(rows)
    eligible = diag[diag["k"] <= select_max]
    best_k = int(eligible.loc[eligible["silhouette"].idxmax(), "k"])
    log.info("k selection by silhouette (cap %d) -> k=%d", select_max, best_k)
    return best_k, diag


def run_clustering(cfg: dict | None = None, season: str = "Winter") -> pd.DataFrame:
    """K-Means tiers (+ hierarchical labels) on locality scores; save figs + table."""
    cfg = cfg or load_config()
    M = score_matrix(cfg, season)[CLUSTER_DIMS]
    X = M.to_numpy(float)

    best_k, diag = choose_k(X)
    save_table(diag, "cluster_diagnostics")

    km = KMeans(n_clusters=best_k, random_state=42, n_init=10).fit(X)
    Z = linkage(X, method="ward")
    hier = fcluster(Z, t=best_k, criterion="maxclust")

    out = M.copy()
    out["kmeans_cluster"] = km.labels_
    out["hier_cluster"] = hier
    # name tiers by mean score (Tier 1 = best overall)
    tier_order = (out.groupby("kmeans_cluster")[CLUSTER_DIMS].mean().mean(axis=1)
                  .sort_values(ascending=False).index)
    tier_map = {c: f"Tier {i+1}" for i, c in enumerate(tier_order)}
    out["tier"] = out["kmeans_cluster"].map(tier_map)
    out = out.reset_index().sort_values(["tier", "locality"])
    save_table(out, "locality_clusters")
    log.info("tiers: %s", {t: list(g["locality"]) for t, g in out.groupby("tier")})

    _plot_diag(diag, best_k)
    _plot_dendrogram(Z, M.index, best_k)
    _plot_pca(X, km.labels_, M.index, tier_map)
    return out


def _plot_diag(diag: pd.DataFrame, best_k: int) -> None:
    import matplotlib.pyplot as plt
    fig, ax1 = plt.subplots(figsize=(6.5, 4.2))
    ax1.plot(diag["k"], diag["inertia"], "o-", color="#2c7fb8", label="inertia (elbow)")
    ax1.set_xlabel("k"); ax1.set_ylabel("inertia", color="#2c7fb8")
    ax2 = ax1.twinx()
    ax2.plot(diag["k"], diag["silhouette"], "s--", color="#d95f02", label="silhouette")
    ax2.set_ylabel("silhouette", color="#d95f02")
    ax1.axvline(best_k, ls=":", c="grey"); ax1.set_title(f"Cluster selection (chosen k={best_k})")
    save_fig(fig, "cluster_selection"); plt.close(fig)


def _plot_dendrogram(Z, labels, best_k: int) -> None:
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(9, 4.5))
    dendrogram(Z, labels=list(labels), leaf_rotation=90, leaf_font_size=8, ax=ax)
    ax.set_title("Hierarchical clustering (Ward) of Pune localities")
    ax.set_ylabel("distance")
    save_fig(fig, "cluster_dendrogram"); plt.close(fig)


def _plot_pca(X: np.ndarray, labels, names, tier_map) -> None:
    import matplotlib.pyplot as plt
    from sklearn.decomposition import PCA
    P = PCA(n_components=2, random_state=42).fit_transform(X)
    fig, ax = plt.subplots(figsize=(7, 5.5))
    sc = ax.scatter(P[:, 0], P[:, 1], c=labels, cmap="tab10", s=60)
    for (x, y), n in zip(P, names):
        ax.annotate(n, (x, y), fontsize=7, xytext=(3, 3), textcoords="offset points")
    ax.set_xlabel("PC1"); ax.set_ylabel("PC2")
    ax.set_title("Locality clusters (PCA projection of dimension scores)")
    save_fig(fig, "cluster_pca"); plt.close(fig)
