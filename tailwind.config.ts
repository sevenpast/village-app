import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Village Brand Colors
        'village-beige': {
          DEFAULT: '#FAF6F0',
          bg: '#FAF6F0',
        },
        'village-green': {
          DEFAULT: '#2D5016',
          dark: '#2D5016',
          light: '#3D6A20',
        },
        'village-orange': {
          DEFAULT: '#C85C1A',
          rust: '#C85C1A',
        },
        'village-brown': {
          DEFAULT: '#8B6F47',
          beige: '#8B6F47',
        },
        // Semantic colors using brand colors
        background: {
          DEFAULT: '#FAF6F0',
          alt: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#2D5016',
          hover: '#3D6A20',
          light: '#E8F0E4',
        },
        accent: {
          DEFAULT: '#C85C1A',
          hover: '#B84A10',
          light: '#F9E8DB',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
        mono: ['monospace'],
      },
      spacing: {
        // Custom spacing if needed
      },
      borderRadius: {
        // Custom border radius if needed
      },
    },
  },
  plugins: [],
}

export default config

