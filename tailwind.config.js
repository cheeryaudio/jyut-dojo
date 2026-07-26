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
        accent: '#C4622D',
        'accent-soft': '#F1E2D6',
        tone1: '#E5484D',
        tone2: '#E8930C',
        tone3: '#12A594',
        tone4: '#3E63DD',
        tone5: '#8E4EC6',
        tone6: '#60646C',
      },
      fontFamily: {
        hk: ['"Noto Sans HK"', 'system-ui', 'sans-serif'],
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
