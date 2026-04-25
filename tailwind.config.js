/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'syntax-primary':   'var(--color-syntax-primary)',
        'syntax-secondary': 'var(--color-syntax-secondary)',
        'syntax-accent':    'var(--color-syntax-accent)',
        'syntax-muted':     'var(--color-syntax-muted)',
        'syntax-value':     'var(--color-syntax-value)',
        bg:     'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised:  'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: 'var(--color-border)',
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
        'fade-in':        'fade-in 200ms ease-out',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.35' },
          '50%':      { opacity: '0.65' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

