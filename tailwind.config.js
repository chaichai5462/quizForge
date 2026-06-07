/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#534AB7', light: '#6B62D4', dark: '#3D358F' },
        teal: { DEFAULT: '#1D9E75', light: '#24C491', dark: '#157A5A' },
        accent: { DEFAULT: '#F97316', light: '#FB923C', dark: '#EA6C00' },
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
