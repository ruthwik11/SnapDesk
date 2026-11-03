/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#141414",
        light: "#f7f5f0",
        gold: "#ede6db", // Replaced yellow/gold with elegant offwhite/beige
        beige: "#ede6db",
        offwhite: "#f5efe6",
        g1: "#1a1a1a",
        g2: "#262626",
        g3: "#333333",
        g6: "#808080",
        g7: "#e5e5e5",
        parchment: "#f4ede2",
        renaissanceRed: "#8b2635",
        renaissanceBlue: "#1c3f60",
      },
      fontFamily: {
        comfortaa: ["Comfortaa", "cursive", "sans-serif"],
        helvetica: ["Helvetica", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Comfortaa", "Helvetica", "sans-serif"],
        sans: ["Helvetica", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["Comfortaa", "Helvetica", "sans-serif"],
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}

