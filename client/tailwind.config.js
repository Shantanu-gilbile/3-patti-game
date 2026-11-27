/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          light: '#1f683a',
          DEFAULT: '#144d29',
          dark: '#0c3019',
          board: '#071f10'
        },
        gold: {
          light: '#fde047',
          DEFAULT: '#eab308',
          dark: '#ca8a04'
        }
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'deal-card': 'dealCard 0.4s ease-out forwards',
        'chip-to-pot': 'chipToPot 0.6s ease-in-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards'
      },
      keyframes: {
        dealCard: {
          '0%': { transform: 'scale(0.3) translateY(-100px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' }
        },
        chipToPot: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(var(--tx, 0), var(--ty, 0)) scale(1.1)' },
          '100%': { transform: 'translate(var(--tx, 0), var(--ty, 0)) scale(0.8)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [],
}
