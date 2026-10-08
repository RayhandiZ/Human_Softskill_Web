/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        ink: 'var(--text-primary)',
        'ink-2': 'var(--text-secondary)',
        'ink-3': 'var(--text-muted)',
        brand: {
          DEFAULT: 'var(--brand)',
          soft: 'var(--brand-soft)',
          ink: 'var(--brand-ink)',
          deep: 'var(--brand-deep)',
        },
        accent: 'var(--accent)',
        c1: 'var(--c1)',
        c2: 'var(--c2)',
        c3: 'var(--c3)',
        c4: 'var(--c4)',
        c5: 'var(--c5)',
        good: 'var(--good)',
        warning: 'var(--warning)',
        serious: 'var(--serious)',
        critical: 'var(--critical)',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { xl2: '1rem' },
      boxShadow: {
        // Kartu cukup dibatasi garis rambut; bayangannya hanya setipis untuk
        // memisahkan dari latar, bukan untuk mengangkatnya.
        card: '0 1px 2px rgba(16, 20, 50, .04)',
        pop: '0 12px 32px -8px rgba(16,20,50,.28)',
      },
      maxWidth: { shell: '1240px' },
    },
  },
  plugins: [],
}
