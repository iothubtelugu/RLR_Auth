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
        background: "#F4FBFF",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#073B8C",
          hover: "#062F70",
          light: "#EBF3FF",
        },
        secondary: {
          DEFAULT: "#1677C8",
          hover: "#1262A5",
          light: "#E7F3FC",
        },
        accent: {
          cyan: "#00A9E8",
          "cyan-light": "#E5F7FD",
          yellow: "#FFD21C",
          "yellow-light": "#FFFBE6",
        },
        text: {
          primary: "#172B4D",
          secondary: "#64748B",
          muted: "#94A3B8",
        },
        border: {
          DEFAULT: "#E2EAF2",
          dark: "#CBD5E1",
        },
        status: {
          success: "#16A34A",
          "success-light": "#DCFCE7",
          warning: "#F59E0B",
          "warning-light": "#FEF3C7",
          error: "#DC2626",
          "error-light": "#FEE2E2",
          info: "#00A9E8",
          "info-light": "#E0F2FE",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(7, 59, 140, 0.05), 0 1px 2px -1px rgba(7, 59, 140, 0.05)",
        card: "0 4px 6px -1px rgba(7, 59, 140, 0.07), 0 2px 4px -2px rgba(7, 59, 140, 0.05)",
        elevated: "0 10px 15px -3px rgba(7, 59, 140, 0.08), 0 4px 6px -4px rgba(7, 59, 140, 0.04)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 2s ease-in-out infinite",
      },
      keyframes: {
        scanline: {
          "0%, 100%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
