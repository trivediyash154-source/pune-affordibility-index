import { useState, useEffect } from 'react';

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light"); // DEFAULT = LIGHT
  
  useEffect(() => {
    const saved = localStorage.getItem("pune-index-theme") as Theme;
    if (saved) {
      setTheme(saved);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);
  
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("pune-index-theme", theme);
  }, [theme]);
  
  return { theme, setTheme };
}
