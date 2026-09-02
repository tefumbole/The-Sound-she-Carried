/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crimson: '#8B1538',
        chrome: '#C9D0D8',
        ink: '#050A18',
        navy: '#050A18',
        navyMid: '#0B1A33',
        gold: '#D4AF37',
        goldSoft: '#E8C872',
        bronze: '#9A7B1C',
        cyan: '#00E5FF',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
