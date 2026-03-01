import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f3f9",
          100: "#dce4f0",
          200: "#c0cee3",
          300: "#94aece",
          400: "#6287b5",
          500: "#3f679c",
          600: "#2e5184",
          700: "#26416c",
          800: "#1B2A4A",
          900: "#162244",
          950: "#0e1629",
        },
        gold: {
          50: "#fdf8ee",
          100: "#f9efd4",
          200: "#f2dca3",
          300: "#e9c368",
          400: "#C9A961",
          500: "#c49035",
          600: "#ae7628",
          700: "#915b23",
          800: "#764924",
          900: "#623c21",
          950: "#361e0e",
        },
        teal: {
          50: "#f0faf5",
          100: "#daf4e7",
          200: "#b8e8d1",
          300: "#84d4b2",
          400: "#4db88d",
          500: "#2A7F62",
          600: "#1f6b52",
          700: "#1a5644",
          800: "#174537",
          900: "#13392e",
          950: "#0a2019",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
