/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        khadi: {
          DEFAULT: "#F4EDDD",
          dark: "#E9DFC7",
        },
        ledger: "#1F2A3C",
        saffron: {
          DEFAULT: "#E38B29",
          dark: "#C46F14",
        },
        bottle: {
          DEFAULT: "#1F4B3F",
          light: "#2E6B58",
        },
        ink: "#2A2118",
        muted: "#7A6F5D",
        borderc: "#D8CBA8",
      },
      fontFamily: {
        display: ["'Yatra One'", "cursive"],
        body: ["'Hind'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
