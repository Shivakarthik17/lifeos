import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070B1A",
        surface: "#0E1430",
        "surface-2": "#141C3A",
        border: "#1F2A52",
        accent: {
          DEFAULT: "#7F77DD",
          hover: "#9089E6",
          soft: "rgba(127, 119, 221, 0.15)",
        },
        muted: "#9AA3C7",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(127, 119, 221, 0.45)",
        card: "0 10px 30px -15px rgba(0, 0, 0, 0.6)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(ellipse at top, rgba(127,119,221,0.25), transparent 60%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
