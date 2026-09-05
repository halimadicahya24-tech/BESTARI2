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
          dark: '#1E4852',
          darker: '#17373F',
          teal: '#2A5B64',
          accent: '#2D8A68',
          mint: '#A8E6CF',
          lightmint: '#D9F7EC',
          bg: '#EFF4F2',
          card: '#FFFFFF',
          warning: '#D9534F',
          warningBg: '#FDE8E8',
          subtext: '#6B878C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
