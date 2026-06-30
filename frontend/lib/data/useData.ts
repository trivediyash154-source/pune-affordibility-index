"use client";

// Client hook: loads all CSV data once (module-cached) and exposes load state.
import { useEffect, useState } from "react";
import { DataStore, loadAllData } from "./index";

export function useData(): { store: DataStore | null; loading: boolean; error: string | null } {
  const [store, setStore] = useState<DataStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadAllData()
      .then((s) => {
        if (alive) {
          setStore(s);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  return { store, loading, error };
}
