/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#b9dcfd',
          300: '#82c2fa',
          400: '#40a2f6',
          500: '#1484e7',
          600: '#0567c4',
          700: '#06539e',
          800: '#0a467f',
          900: '#0e3c68'
        }
      }
    },
  },
  plugins: [],
};
