/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#06060f',
          900: '#0d0d1f',
          800: '#14142e',
          700: '#1e1e40',
          600: '#2a2a55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 40px rgba(124,58,237,0.45)',
        'glow-violet-lg': '0 0 80px rgba(124,58,237,0.35)',
        'glow-amber': '0 0 24px rgba(245,158,11,0.35)',
        card: '0 8px 32px rgba(0,0,0,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.32,0.72,0,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
