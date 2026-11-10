/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./index.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#76D865",
        "primary-soft": "#EBF9E8",
        navy: "#1A2433",
        ink: "#1D1D1D",
        muted: "#7E8B9B",
        line: "#E5E7EB",
        chip: "#F4F5F7",
        surface: "#F4F5F7",
      },
    },
  },
  plugins: [],
};
