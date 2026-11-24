/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F0F5F2',
          100: '#E0EBE4',
          200: '#C2D7CB',
          300: '#95BEA5',
          400: '#64A07D',
          500: '#3F795A', // Secondary green
          600: '#245C43', // Primary Forest Green
          700: '#1D4A36',
          800: '#163829',
          900: '#10271D',
          DEFAULT: '#245C43',
        },
        moss: {
          DEFAULT: '#3F795A',
          light: '#5B9374',
          dark: '#2E5A42',
        },
        sage: {
          50: '#F6F9F6',
          100: '#E7EFE7', // Soft accent
          200: '#CFDFCF',
          DEFAULT: '#E7EFE7',
        },
        sand: {
          50: '#FFFFFF',
          100: '#FDFEFA',
          DEFAULT: '#F7F8F3', // Warm off-white
          200: '#ECEEE6',
        },
        charcoal: {
          DEFAULT: '#202923', // Deep charcoal
          soft: '#334037',
          muted: '#748078', // Muted grey-green
        },
        earth: {
          border: '#E3E9E2', // Soft natural grey
          card: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(32, 41, 35, 0.05), 0 1px 2px -1px rgba(32, 41, 35, 0.05)',
        'card': '0 4px 12px 0 rgba(36, 92, 67, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
        'elevated': '0 10px 25px -5px rgba(36, 92, 67, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}