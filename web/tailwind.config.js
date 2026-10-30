/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas:      '#FAF7F0',
        ink:         '#14213D',
        'ink-soft':  '#4A5468',
        'ink-faint': '#8A92A3',
        primary:     '#1D5BF0',
        'primary-ink':'#0F3AA8',
        'primary-tint':'#E8EFFE',
        highlight:   '#FFD84D',
        'highlight-ink':'#7A5B00',
        success:     '#1F9D55',
        'success-tint':'#E5F4EC',
        danger:      '#D64545',
        'danger-tint':'#FBE9E9',
        line:        'rgba(20,33,61,0.08)',
        'line-strong':'rgba(20,33,61,0.14)',
        surface:     '#FFFFFF',
        'surface-alt':'#F3EEE2',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        panel: '20px',
      },
      boxShadow: {
        glass: '0 1px 0 rgba(255,255,255,0.65) inset, 0 1px 2px rgba(20,33,61,0.04), 0 24px 48px -24px rgba(20,33,61,0.18)',
        'glass-sm': '0 1px 0 rgba(255,255,255,0.55) inset, 0 1px 2px rgba(20,33,61,0.05)',
        cta: '0 1px 2px rgba(20,33,61,0.06), 0 10px 30px -10px rgba(29,91,240,0.55)',
      },
      backdropBlur: {
        panel: '24px',
        sub: '12px',
      },
    },
  },
  plugins: [],
}
