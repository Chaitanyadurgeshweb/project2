import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14212B",
        muted: "#5B6B78",
        line: "#D6DCE1",
        paper: "#F4F6F8",
        rail: { DEFAULT: "#1D4E89", dark: "#143A67", soft: "#E6EEF7" },
        go: { DEFAULT: "#1E8E5A", soft: "#E3F4EB" },
        caution: { DEFAULT: "#B7791F", soft: "#FBF1DC" },
        stop: { DEFAULT: "#C0392B", soft: "#FBE7E4" },
      },
      fontFamily: { sans: ["var(--font-barlow)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
