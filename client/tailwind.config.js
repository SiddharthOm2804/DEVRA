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
        sans: ["Manrope", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["'Space Grotesk'", "Manrope", "sans-serif"],
        cursive: ["'Space Grotesk'", "Manrope", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        // ABYSSAL JADE COLOR SYSTEM
        abyssal: {
          dark: "#070B0D",       // Core petrol-black foundation (60%)
          card: "#0E1517",       // Elevated card surface
          surface: "#141E20",    // Secondary surface
          border: "#243437",     // Subtle jade border
          borderLight: "#355052",// Interactive hover border
          jade: "#61DCC4",       // Mineral Jade primary accent
          jadeHover: "#48C9B0",
          citron: "#D8E78A",     // Signature Citron accent
          citronHover: "#C8D878",
          ivory: "#F1F4ED",      // Opal Ivory light text & light surfaces (20%)
          secondary: "#ADBCB7",  // Secondary text
          muted: "#788B86",      // Muted text
          error: "#F17C78",      // Error state
        },
        // Core Balanced Palette mapped to Abyssal Jade
        brand: {
          dark: "#070B0D",
          darkSurface: "#0E1517",
          darkBorder: "#243437",
          light: "#0B1113",
          card: "#141E20",
          border: "#243437",
          lavender: "#61DCC4",   // Re-mapped to Mineral Jade
          lavenderHover: "#48C9B0",
          blue: "#D8E78A",       // Re-mapped to Signature Citron
          textDark: "#F1F4ED",
          textMuted: "#788B86",
          textLight: "#F1F4ED",
          textLightMuted: "#ADBCB7",
        },
      },
      boxShadow: {
        "jade-glow": "0 0 25px -4px rgba(97, 220, 196, 0.22)",
        "jade-glow-lg": "0 0 50px -10px rgba(97, 220, 196, 0.3)",
        "citron-glow": "0 0 25px -4px rgba(216, 231, 138, 0.22)",
        "card-jade": "0 4px 20px -2px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(36, 52, 55, 0.65)",
        "glass-inner": "inset 0 1px 1px 0 rgba(97, 220, 196, 0.13)",
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
