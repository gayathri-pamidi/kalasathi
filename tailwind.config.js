/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        artisan: {
          50: '#FDFBF7',
          100: '#FAF4E8',
          200: '#F4E7CE',
          300: '#E8CE9D',
          400: '#D9AF69',
          500: '#C88A3B',
          600: '#B26E2A',
          700: '#945322',
          800: '#7B4222',
          900: '#643720',
        },
        terracotta: {
          50: '#FFF6F3',
          100: '#FFEBE3',
          200: '#FFD4C4',
          300: '#FFAF94',
          400: '#F77D59',
          500: '#E05A32',
          600: '#C8431C',
          700: '#A43212',
          800: '#862B14',
          900: '#6E2816',
        },
        earth: {
          dark: '#1E242B',
          slate: '#334155',
          cream: '#F9F6F0',
          sand: '#EFEAE1',
          border: '#E2D9CC',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'floating': '0 14px 40px rgba(0, 0, 0, 0.12)',
        'craft': '0 4px 20px -2px rgba(200, 90, 50, 0.15)',
      }
    },
  },
  plugins: [],
}
