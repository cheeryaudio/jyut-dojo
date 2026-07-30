/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F2',
        ink: '#26211C',
        card: '#FFFFFF',
        line: '#E8E2D8',
        accent: '#A9471D',
        'accent-soft': '#F1E2D6',
        tone1: '#C8303E',
        tone2: '#8A5200',
        tone3: '#00756B',
        tone4: '#294BCB',
        tone5: '#6F2DA8',
        tone6: '#4E5155',
      },
      fontFamily: {
        hk: ['"Noto Sans CJK HK"', '"Noto Sans HK"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(38, 33, 28, 0.04), 0 4px 16px rgba(38, 33, 28, 0.05)',
      },
    },
  },
  plugins: [],
};
