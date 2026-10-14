/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        devra: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Electric Violet
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065"
        },
        cyber: {
          bg: "#060911", // Deep midnight obsidian
          surface: "#0A0E1A", // Primary card background
          elevated: "#101628", // Elevated panel
          border: "rgba(255, 255, 255, 0.08)",
          borderGlow: "rgba(139, 92, 246, 0.3)",
          violet: "#8B5CF6", // Primary Accent
          cyan: "#06B6D4",   // Secondary Accent
          ice: "#38BDF8",    // Ice Blue
          magenta: "#EC4899",// Accent
          emerald: "#10B981" // Restrained Emerald
        }
      },
      boxShadow: {
        "glow-violet": "0 0 25px -5px rgba(139, 92, 246, 0.35)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.35)",
        "glow-subtle": "0 0 35px -10px rgba(139, 92, 246, 0.2)",
        "glass-inner": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)"
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        }
      }
    },
  },
  plugins: [],
}
