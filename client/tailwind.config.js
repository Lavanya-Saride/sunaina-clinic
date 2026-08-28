export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs: '420px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#4f172d',
          dark: '#3a0f21',
          light: '#6b0124',
        },
        blush: {
          DEFAULT: '#ffecf0',
          dark: '#fbd9e1',
        },
        cream: '#fbf9f9',
        ink: '#221b1e',
        muted: '#6b6266',
        line: '#e7e1e2',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(79, 23, 45, 0.06)',
      },
    },
  },
  plugins: [],
}

