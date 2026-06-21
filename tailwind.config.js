/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2B1A2E', // deep plum, for text on light cards
        cream: '#FFF6F0', // warm near-white
        coral: '#FF6B5B',
        punch: '#FF3D8B',
        amber: '#FFB13C',
        grape: '#7C5CFF',
        sky: '#3EC6FF',
        emerald: '#1FC79B',
      },
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -20px rgba(43, 26, 46, 0.45)',
        card: '0 30px 70px -28px rgba(43, 26, 46, 0.5)',
        'glow-punch': '0 18px 45px -12px rgba(255, 61, 139, 0.6)',
        'glow-grape': '0 18px 45px -12px rgba(124, 92, 255, 0.55)',
        'glow-emerald': '0 18px 45px -12px rgba(31, 199, 155, 0.5)',
      },
      borderRadius: {
        blob: '2rem',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.4) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(1.12) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -32px) scale(1.08)' },
          '66%': { transform: 'translate(-22px, 18px) scale(0.94)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-130%)' },
          '100%': { transform: 'translateX(130%)' },
        },
      },
      animation: {
        pop: 'pop 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28) both',
        wiggle: 'wiggle 0.7s ease-in-out infinite',
        'float-up': 'float-up 0.45s ease-out both',
        'blob-slow': 'blob 18s ease-in-out infinite',
        'blob-slower': 'blob 24s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
