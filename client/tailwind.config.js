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
          50: "#f0f4ff",
          100: "#e0e9fe",
          200: "#bad0fe",
          300: "#7faefd",
          400: "#3d82fa",
          500: "#165df6",
          600: "#0b42eb",
          700: "#0b34cc",
          800: "#0f2da4",
          900: "#132b81",
          950: "#0a133f"
        },
        cyber: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          neon: "#00F0FF",
          accent: "#7928CA"
        }
      }
    },
  },
  plugins: [],
}
