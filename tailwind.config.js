/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'main-bg': '#FFF4D9',
        border: '#FFE4A8',
        'main-cta': '#F3C042',
        accent: '#DCB280',
        text: '#3C584A',
        'secondary-button-bg': '#F9F3E5',
      },
      fontFamily: {
        'feather': ['Feather Bold'],
        'din': ['DIN Next Rounded LT W01 Regular'],
      },
      boxShadow: {
        'button-secondary': '0px 6.716px 0px 0px #FFE4A8',
      },
      borderRadius: {
        'button-secondary': '26.149px',
      },
      borderWidth: {
        'button-secondary': '4.358px',
      }
    },
  },
  plugins: [],
};
