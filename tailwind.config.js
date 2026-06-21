/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBF6E9',
        'paper-deep': '#F3EAD3',
        ink: '#2B2B3A',
        tangerine: '#FF7A4D',
        sky: '#4DA8FF',
        sunshine: '#FFCE3D',
        mint: '#4FD1A5',
        grape: '#9B6DFF',
      },
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
        hand: ['"Gloria Hallelujah"', 'cursive'],
      },
      boxShadow: {
        sticker: '4px 4px 0 0 #2B2B3A',
        'sticker-lg': '7px 7px 0 0 #2B2B3A',
        'sticker-sm': '3px 3px 0 0 #2B2B3A',
      },
      borderRadius: {
        blob: '1.75rem',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.4) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(1.12) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pop: 'pop 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28) both',
        wiggle: 'wiggle 0.6s ease-in-out',
        'float-up': 'float-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
