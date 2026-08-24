/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta industrial/obra — evita o "cream + terracota" genérico.
        // Base: aço/concreto; acento: amarelo-segurança (sinalização de EPI);
        // status seguem semáforo de obra.
        steel: {
          950: '#12161c',
          900: '#1a2029',
          800: '#232b37',
          700: '#323d4d',
          600: '#4a5568',
          400: '#8492a6',
          200: '#d4dbe4',
          50: '#f5f7fa',
        },
        safety: {
          DEFAULT: '#f2b100', // amarelo-segurança
          dark: '#c98e00',
        },
        status: {
          ok: '#2f9e44',
          warn: '#f2b100',
          critical: '#e8590c',
          danger: '#e03131',
          off: '#868e96',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
