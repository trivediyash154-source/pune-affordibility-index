import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-sunken": "var(--surface-sunken)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-fg": "var(--accent-fg)",
        coral: "var(--coral)",
        "coral-soft": "var(--coral-soft)",
        teal: "var(--teal)",
        "teal-soft": "var(--teal-soft)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
        indigo: "var(--indigo)",
        "indigo-soft": "var(--indigo-soft)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        "card-bg": "var(--card-bg)",
        "card-border": "var(--card-border)",
        "nav-bg": "var(--nav-bg)",
        "season-monsoon": "var(--season-monsoon)",
        "season-summer": "var(--season-summer)",
        "season-winter": "var(--season-winter)",
      },
      fontFamily: {
        fraunces: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        inter: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px var(--border-glow), 0 10px 40px rgba(240,165,0,0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { "fade-up": "fade-up 0.4s ease-out both" },
    },
  },
  plugins: [],
};

export default config;
