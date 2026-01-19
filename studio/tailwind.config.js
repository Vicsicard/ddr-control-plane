/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dcg: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          success: '#16a34a',
          warning: '#ca8a04',
          error: '#dc2626',
          surface: '#f8fafc',
          border: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
