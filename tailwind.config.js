/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        baseball: {
          primary: '#1e3a8a',
          secondary: '#3730a3',
          accent: '#10b981'
        }
      }
    },
  },
  plugins: [],
}