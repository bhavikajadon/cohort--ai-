/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF5C1A',
          'orange-light': '#FF8C5A',
          'orange-pale': '#FFF0EB',
          'orange-dim': '#FFE0D0',
          black: '#1A1A1A',
          gray: '#6B6B6B',
          'gray-light': '#9B9B9B',
          surface: '#F5F0EB',
          bg: '#FAFAF8',
          white: '#FFFFFF',
          border: '#E8E2DC',
          'border-dark': '#D0C8C0',
          success: '#1A9B5A',
          warning: '#E0880A',
          danger: '#CC2222',
          info: '#1A5CCC',
        }
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(26,26,26,0.06), 0 1px 2px rgba(26,26,26,0.04)',
        'card-hover': '0 4px 12px rgba(26,26,26,0.10)',
        'orange': '0 4px 20px rgba(255,92,26,0.25)',
        'orange-sm': '0 2px 8px rgba(255,92,26,0.18)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-orange': 'pulseOrange 2s ease-in-out infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseOrange: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%': { boxShadow: '0 0 4px rgba(255,92,26,0.3)' },
          '100%': { boxShadow: '0 0 12px rgba(255,92,26,0.7)' },
        }
      }
    },
  },
  plugins: [],
}
