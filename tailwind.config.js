/** Tailwind config — token 落地，依 docs/02-design-system.md */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 走 CSS 变量，切换主题/深色模式只改变量根值
        primary: 'var(--color-primary)',
        surface: 'var(--color-surface)',
        'surface-variant': 'var(--color-surface-variant)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        // 中性灰阶（9 级）
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
      },
      spacing: {
        // 4/8/12/16/24/32/48 → xs/sm/md/lg/xl/2xl/3xl
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        // 4/8/12/16/24/999
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '999px',
      },
      fontFamily: {
        sans: [
          'HarmonyOS Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: ['HarmonyOS Sans', 'system-ui', 'sans-serif'],
      },
      // 断点：768/1024 标准断点（docs/02）
      screens: {
        sm: '480px',
        md: '768px',
        lg: '1024px',
      },
      transitionTimingFunction: {
        'q-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
