import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-bricolage)', 'serif'],
        body: ['var(--font-hanken)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        paper: 'var(--color-paper)',
        ink: 'var(--color-ink)',
        'ink-muted': 'var(--color-ink-muted)',
        accent: 'var(--color-accent)',
        'pos-gk': 'var(--color-pos-gk)',
        'pos-def': 'var(--color-pos-def)',
        'pos-mid': 'var(--color-pos-mid)',
        'pos-att': 'var(--color-pos-att)',
      },
    },
  },
  plugins: [],
}
export default config
