/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E7D32',
          light: '#C8E6C9',
          dark: '#1B5E20',
        },
        secondary: {
          DEFAULT: '#F57C00',
          light: '#FFE0B2',
          dark: '#E65100',
        },
        accent: {
          DEFAULT: '#1976D2',
          light: '#BBDEFB',
          dark: '#0D47A1',
        },
      },
    },
  },
  plugins: [],
};
