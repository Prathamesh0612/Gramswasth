/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFAF4',
          100: '#FDF6EC',
          200: '#F9EDD8',
          300: '#F3DEB8',
        },
        sage: {
          400: '#8FAF95',
          500: '#6B8F71',
          600: '#527A58',
          700: '#3D5E42',
        },
        terra: {
          400: '#D4956D',
          500: '#C47F5E',
          600: '#A96845',
        },
        amber: {
          alert: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Lexend', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(107,143,113,0.08)',
        soft: '0 1px 8px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
