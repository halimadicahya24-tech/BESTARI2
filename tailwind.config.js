/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        bestari: {
          primary: '#163F4C',
          primaryContainer: '#305664',
          onPrimaryContainer: '#A3CADA',
          secondary: '#386758',
          secondaryContainer: '#B8EAD7',
          onSecondaryContainer: '#3D6B5C',
          tertiary: '#323C39',
          bg: '#F8FAF9',
          surface: '#FFFFFF',
          surfaceLow: '#F2F4F3',
          surfaceContainer: '#ECEEED',
          surfaceHigh: '#E6E9E8',
          surfaceHighest: '#E1E3E2',
          onSurface: '#191C1C',
          onSurfaceVariant: '#41484B',
          outline: '#71787B',
          outlineVariant: '#C1C7CB',
          warning: '#D97706',
          warningBg: '#FEF3C7',
          danger: '#BA1A1A',
          dangerBg: '#FFDAD6',
          dark: '#163F4C',
          darker: '#0E2A33',
          teal: '#305664',
          accent: '#386758',
          mint: '#B8EAD7',
          lightmint: '#E6F4F0',
          card: '#FFFFFF',
          subtext: '#5D6B6E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hanken: ['"Hanken Grotesk"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
