import type { Config } from 'tailwindcss';

// Dark-only design ported from the old web/src/style.css palette. The shadcn
// token names (background/foreground/border/primary…) are mapped to the
// original CSS variables defined in app/globals.css, so the look is unchanged.
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--border)',
        ring: 'var(--accent)',
        background: 'var(--bg)',
        foreground: 'var(--text)',
        // Original custom tokens, kept verbatim for 1:1 visual parity.
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        green: 'var(--green)',
        amber: 'var(--amber)',
        tool: 'var(--tool)',
        danger: '#e5484d',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      keyframes: {
        spin: { to: { transform: 'rotate(360deg)' } },
        pulse: { '50%': { boxShadow: '0 0 0 4px rgba(229, 72, 77, 0.25)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
