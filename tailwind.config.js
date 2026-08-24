/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        khadi: {
          DEFAULT: "rgb(var(--c-khadi) / <alpha-value>)",
          dark: "rgb(var(--c-khadi-dark) / <alpha-value>)",
        },
        ledger: "rgb(var(--c-ledger) / <alpha-value>)",
        saffron: {
          DEFAULT: "rgb(var(--c-saffron) / <alpha-value>)",
          dark: "rgb(var(--c-saffron-dark) / <alpha-value>)",
        },
        bottle: {
          DEFAULT: "rgb(var(--c-bottle) / <alpha-value>)",
          light: "rgb(var(--c-bottle-light) / <alpha-value>)",
        },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        borderc: "rgb(var(--c-borderc) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Yatra One'", "cursive"],
        body: ["'Hind'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
