/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'slate-750': '#293548',
        'slate-850': '#151e2e',
        accent: 'var(--accent)',
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
      },
      fontFamily: {
        sans: ['Poppins', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Poppins', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        tag: 'var(--r-tag, 8px)',
        control: 'var(--r-control, 10px)',
        button: 'var(--r-button, 12px)',
        card: 'var(--r-card, 16px)',
        modal: 'var(--r-modal, 20px)',
      },
    },
  },
  plugins: [],
}
