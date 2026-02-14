import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#fafafa",
        muted: { DEFAULT: "#27272a", foreground: "#a1a1aa" },
        border: "#27272a",
        card: { DEFAULT: "#0c0c0f", foreground: "#fafafa" },
        primary: { DEFAULT: "#6366f1", foreground: "#ffffff" },
        accent: "#818cf8",
        destructive: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
