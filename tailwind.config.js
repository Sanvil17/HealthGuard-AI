/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0D1B2A',
        'app-panel': '#132235',
        'app-card': '#1A2F46',
      },
    },
  },
  plugins: [],
}

