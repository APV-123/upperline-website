/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      colors: {
        upperline: {
          navy: "hsl(203 100% 18%)",
          turquoise: "hsl(187 70% 53%)",
          iron: "hsl(213 6% 31%)",      // #4B4F54
          gray: "hsl(216 2% 54%)",      // #888A8D
          warm: "hsl(43 21% 81%)",      // #D8D2C3
          tangerine: "hsl(29 93% 57%)",  // #F78D2A
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
