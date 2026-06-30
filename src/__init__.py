"""Pune Affordability Index — reproducible, real-data research pipeline.

Modules
-------
ingest      : download/stage real raw data (AQI, India-rent, RR rates) with provenance
geo         : geocode the 15 localities; road-network distances to work hubs
features    : OSM amenity/safety counts; build the per-locality indicator table
preprocess  : clean + parse raw sources (esp. the wide AQI matrix)
index       : min-max normalisation + weighted composite (reproduces the Excel exactly)
mcda        : entropy weighting + TOPSIS (objective cross-checks)
sensitivity : Monte-Carlo weight perturbation -> ranking stability
models      : rent-prediction ML (LR/RF/GB/XGB + SHAP) and clustering
recommend   : transparent 5-persona weighted re-rank
viz         : publication-quality figures (300 dpi)
utils       : config, logging, seeds, provenance, IO helpers
"""
