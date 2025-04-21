/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Old colors (keep for reference or remove if unused)
        // 'main-bg': '#FFF4D9',
        // border: '#FFE4A8',
        // 'main-cta': '#F3C042',
        // accent: '#DCB280',
        // text: '#3C584A',
        // 'secondary-button-bg': '#F9F3E5',

        // New Tokens
        accentGold: '#FCD34D',    // Buttons, progress, XP fill
        surfaceCream: '#FFF8E7',  // Card backgrounds, pills
        forestGreen50: '#D1E8A3', // Light background shapes
        forestGreen80: '#6AA95A', // Trees, path outlines
        textPrimary: '#2D3720',   // All primary text
        shadowColor: 'rgba(0,0,0,0.08)', // Shadow color separate for RN
        pillBorder: '#E9E2C7',      // Border for metric pills
      },
      fontFamily: {
        // Keeping existing fonts, apply sizes via classes
        'feather': ['Feather Bold'],
        'din': ['DIN Next Rounded LT W01 Regular'],
        // Assuming Inter from previous steps might be used for Body/Caption
        'sans': ['Inter-Regular', 'System'], // Example fallback
        'sans-semibold': ['Inter-SemiBold', 'System'], // Example fallback
      },
      fontSize: {
        // Mapping semantic styles to Tailwind sizes
        'h1': '24px',       // H1
        'heading': '18px', // Heading (~17pt)
        'body': '14px',    // Body
        'caption': '12px', // Caption
      },
      boxShadow: {
        // Define the unified shadow - Note: NativeWind shadow support varies
        // This might need platform-specific styling or utility classes
        'card': '0px 2px 4px rgba(0,0,0,0.08)', // Match spec
        'cta-inset': 'inset 0 -2px 2px rgba(0,0,0,0.06)', // Inset shadows are hard in RN
      },
      borderRadius: {
        'card': '16px', // Task Card radius
        // 'button-secondary': '26.149px', // Keep or remove if unused
      },
      // Remove old border width if not needed
      // borderWidth: {
      //   'button-secondary': '4.358px',
      // }
    },
  },
  plugins: [],
};
