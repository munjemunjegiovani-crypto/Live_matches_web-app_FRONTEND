import type { Config } from 'tailwindcss';

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        'surface-2': c('surface-2'),
        'surface-3': c('surface-3'),
        line: c('line'),
        ink: c('ink'),
        muted: c('muted'),
        faint: c('faint'),
        primary: c('primary'),
        'on-primary': c('on-primary'),
        accent: c('accent'),
        live: c('live'),
        warn: c('warn'),
        win: c('win'),
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
        pop: '0 12px 40px -8px rgb(var(--shadow) / 0.35)',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.45', transform: 'scale(.8)' } },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(16px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        flash: { '0%': { backgroundColor: 'rgb(var(--accent) / .28)' }, '100%': { backgroundColor: 'transparent' } },
        ball: { '0%,100%': { transform: 'translate(-50%,-50%) scale(1)' }, '50%': { transform: 'translate(-50%,-50%) scale(1.35)' } },
      },
      animation: {
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        rise: 'rise .35s ease-out both',
        'slide-in': 'slideIn .3s ease-out both',
        flash: 'flash 1.6s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
