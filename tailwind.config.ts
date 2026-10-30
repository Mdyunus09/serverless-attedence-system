import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        kinpaku: {
          50: "#fdfbf4",
          100: "#fbf6e3",
          200: "#f6ecc3",
          300: "#eedd9b",
          400: "#e4c668",
          500: "#d9ad3c", // primary brand gold
          600: "#be8d2d",
          700: "#986725",
          800: "#7c5224",
          900: "#684422",
        },
        patina: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf", // primary patina accent
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        lacquer: {
          base: "#090a0c",
          deep: "#050607",
          raised: "#111317",
          panel: "#16181e",
          border: "rgba(255, 255, 255, 0.08)",
          "border-hover": "rgba(255, 255, 255, 0.16)",
          "gold-border": "rgba(217, 173, 60, 0.35)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.3)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.4)",
        glow: "0 0 24px -4px rgba(217, 173, 60, 0.15)",
        patinaGlow: "0 0 24px -4px rgba(45, 212, 191, 0.18)",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px",
      },
    },
  },
  plugins: [],
};

export default config;

