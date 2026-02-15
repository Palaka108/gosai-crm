import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pesto Tech palette — enterprise dark + organic green
        background: "#0F172A",
        foreground: "#E5E7EB",
        muted: { DEFAULT: "#1E293B", foreground: "#9CA3AF" },
        border: "#334155",
        card: { DEFAULT: "#111827", foreground: "#E5E7EB" },
        primary: { DEFAULT: "#2F6F5E", foreground: "#ffffff" },
        accent: "#3A7D6A",
        link: "#2563EB",
        destructive: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
        // Surface hierarchy
        base: "#1E293B",
        surface: "#1E293B",
        elevated: "#374151",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
