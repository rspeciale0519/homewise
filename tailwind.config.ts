import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

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
          50: "#eeedf5",
          100: "#d5d3e8",
          200: "#aaa8d1",
          300: "#7a77b8",
          400: "#504c9e",
          500: "#3a3688",
          600: "#2E276D",
          700: "#25205a",
          800: "#1c1944",
          900: "#14122f",
          950: "#0b0b1e",
        },
        crimson: {
          50: "#fef2f2",
          100: "#fde3e3",
          200: "#fbcbcb",
          300: "#f8a4a4",
          400: "#f26b6b",
          500: "#e83a3a",
          600: "#DB2526",
          700: "#b81e1f",
          800: "#981e1f",
          900: "#7d1f20",
          950: "#440b0b",
        },
        cream: {
          50: "#fafaf8",
          100: "#f5f4f0",
          200: "#ebe8e1",
          300: "#d8d3c8",
          400: "#c2bbb0",
          500: "#a89f92",
        },
        gold: {
          400: "#D4AF6A",
          500: "#C9A961",
          600: "#B8952F",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      fontSize: {
        "display-2xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["1.875rem", { lineHeight: "1.25" }],
      },
      boxShadow: {
        soft: "0 2px 20px -4px rgba(46, 39, 109, 0.08)",
        elevated: "0 8px 40px -8px rgba(46, 39, 109, 0.15)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px -2px rgba(46, 39, 109, 0.1)",
        dropdown: "0 8px 32px -4px rgba(46, 39, 109, 0.18), 0 2px 8px -2px rgba(0,0,0,0.08)",
      },
      backgroundImage: {
        "gradient-navy": "linear-gradient(135deg, #2E276D 0%, #1c1944 100%)",
        "gradient-hero": "linear-gradient(to bottom, rgba(20,18,47,0.5) 0%, rgba(20,18,47,0.75) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
