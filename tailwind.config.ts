import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f1221",
        foreground: "#f0f0f5",
        muted: { DEFAULT: "#1e2238", foreground: "#8b8fa8" },
        border: "#252a45",
        card: { DEFAULT: "#151929", foreground: "#f0f0f5" },
        primary: { DEFAULT: "#6366f1", foreground: "#ffffff" },
        accent: "#818cf8",
        destructive: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
        // New CRM palette
        base: "#1E2238",
        surface: "#252A45",
        elevated: "#2E3560",
        highlight: "#6FE7DD",
        coral: "#FF8A5B",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
