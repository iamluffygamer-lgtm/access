/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#09090b", // zinc-950
        ink: "#fafafa",   // zinc-50
        muted: "#a1a1aa", // zinc-400
        accent: "#3b82f6", // blue-500
        critical: "#ef4444", // red-500
        serious: "#f97316", // orange-500
        moderate: "#eab308", // yellow-500
        minor: "#71717a", // zinc-500
        good: "#10b981", // emerald-500
        line: "#27272a", // zinc-800
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        sans: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
