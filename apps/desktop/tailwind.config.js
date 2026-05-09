/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Pretendard',
          '"Apple SD Gothic Neo"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        accent: {
          DEFAULT: '#7c3aed',
          50: '#f5f3ff',
          500: '#7c3aed',
          600: '#6d28d9',
        },
      },
    },
  },
  plugins: [],
};
