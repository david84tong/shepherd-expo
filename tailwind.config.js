/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Old colors (keep for reference or remove if unused)
        'main-bg': '#FFF4D9',
        border: '#FFE4A8',
        // 'main-cta': '#F3C042',
        // accent: '#DCB280',
        // text: '#3C584A',
        // 'secondary-button-bg': '#F9F3E5',
        brownBorder: '#eed39d',
        // New Tokens
        blue: '#00B0F7',
        darkBlue: '#119AD1',
        lightBrown: '#FBCA71',
        brightYellow: '#FFD629',
        lightGreen: '#D2FFC6',
        
        darkGreen: '#24CA17',
        accentGold: '#FCD34D', // Buttons, progress, XP fill
        surfaceCream: '#FDEBB8', // Card backgrounds, pills
        surfaceCreamLight: '#fff1c9', // Card backgrounds, pills
        forestGreen50: '#A8F093', // Light background shapes
        forestGreen80: '#24CA17', // Trees, path outlines
        textPrimary: '#795323', // All primary text
        orange: '#FF8800', // All primary text
        brown: '#634012', // All primary text
        gold: '#FBCA71', // All primary text
        shadowColor: 'rgba(0,0,0,0.08)', // Shadow color separate for RN
        pillBorder: '#E9E2C7', // Border for metric pills
        description: '#B89B4C',
        buttonBorder: '#FFE4A8',
        red: '#DF4533',

        // Path colors from Path.ts (Adjusted to be lighter backgrounds)
        lightYellow: '#FFFBC8',
        darkYellow: '#F7B500',

        lightRed: '#FFD2D2',
        darkRed: '#E64132',

        lightOrange: '#FFE6CC',
        darkOrange: '#FF8C1A',

        lightTeal: '#C6FFF6',
        darkTeal: '#17CABC',

        lightPurple: '#E8D6FF',
        darkPurple: '#7B2BFF',

        lightPink: '#FFD6F0',
        darkPink: '#E6319E',

        lightCrimson: '#FFE0DC',
        darkCrimson: '#C81E28',

        lightIndigo: '#D9E0FF',
        darkIndigo: '#3040FF',

        lightBlue: '#D6EEFF',
        darkBlue: '#2196F3',

        lightCyan: '#CCFFFF',
        darkCyan: '#18B2B6',

        lightScarlet: '#FFDAD4',
        darkScarlet: '#D72618',

        // Darker border colors for paths (Keep for potential future use)
        /*
        pathYellowDark: '#D7B644', // Darker yellow
        pathRedDark: '#D97373',    // Darker red
        pathGreenDark: '#72C85A',  // Darker green
        pathOrangeDark: '#D99B73', // Darker orange
        pathTealDark: '#5AC8B5',   // Darker teal
        pathPurpleDark: '#A85AD9',// Darker purple
        pathPinkDark: '#D973A8',   // Darker pink
        pathCrimsonDark: '#D93D3D',// Darker crimson
        pathIndigoDark: '#5A5AD9', // Darker indigo
        pathBlueDark: '#5AA3D9',  // Darker blue
        pathCyanDark: '#5AD9D9',   // Darker cyan
        pathScarletDark: '#D92323' // Darker scarlet
        */
      },
      fontFamily: {
        // Updated font mappings to match actual font files
        feather: ['Nunito-Black'], // for headers
        din: ['DIN Next Rounded LT W01 Regular'], // for body
        'nunito-italic': ['Nunito-BlackItalic'], // Added for backward compatibility
        'nunito-bold': ['Nunito-Bold'], // Added for backward compatibility
        'nunito-black': ['Nunito-Black'], // Added for backward compatibility
        'nunito-medium': ['Nunito-Medium'], // Added for backward compatibility
        'nunito-mediumItalic': ['Nunito-MediumItalic'], // Added for backward compatibility
        'nunito-regular': ['Nunito-Regular'], // Added for backward compatibility
      },
      fontSize: {
        // Mapping semantic styles to Tailwind sizes
        hugeTitle: '48px',
        bigTitle: '40px',
        title: '36px',
        h1: '28px', // H1
        h2: '24px', // H1
        h3: '24px', // H1
        heading: '20px', // Heading (~17pt)
        h4: '18', // H1

        body: '16px', // Body
        caption: '16px', // Caption
        smallCaption: '14px', // Caption
        xsCaption: '12px', // Caption
        mini: '10px'
      },
      boxShadow: {
        // Define the unified shadow - Note: NativeWind shadow support varies
        // This might need platform-specific styling or utility classes
        card: '0px 2px 4px rgba(0,0,0,0.08)', // Match spec
        'cta-inset': 'inset 0 -2px 2px rgba(0,0,0,0.06)',
        'buttonShadow': '0px 5.716px 0px 0px #FFE4A8', // Inset shadows are hard in RN
        'backButton': '0px 5.716px 0px 0px #FFE4A8', // Inset shadows are hard in RN
        'blueButtonShadow': '0px 5.716px 0px 0px #98E1FE', // Fixed blue button shadow
        'appleShadow': '0px 5.716px 0px 0px rgb(67, 67, 67)', // Inset shadows are hard in RN
        'greyShadow': '0px 5.716px 0px 0px #98A1AE', // Inset shadows are hard in RN

        // Shadows for each dark color - solid shadow style with vertical offset
        darkYellow: '0px 5px 0px 0px #F7B500',
        darkRed: '0px 5px 0px 0px #E64132',
        darkGreen: '0px 5px 0px 0px #24CA17',
        darkOrange: '0px 5px 0px 0px #FF8C1A',
        darkTeal: '0px 5px 0px 0px #17CABC',
        darkPurple: '0px 5px 0px 0px #7B2BFF',
        darkPink: '0px 5px 0px 0px #E6319E',
        darkCrimson: '0px 5px 0px 0px #C81E28',
        darkIndigo: '0px 5px 0px 0px #3040FF',
        darkBlue: '0px 5px 0px 0px #2196F3',
        darkCyan: '0px 5px 0px 0px #18B2B6',
        darkScarlet: '0px 5px 0px 0px #D72618',
        gray: '0px 5px 0px 0px #808080',
        darkApple: '0px 5px 0px 0px #171717',
        brownShadow: '0px 5px 0px 0px #CFA860',
        darkBlueShadow: '0px 5px 0px 0px #119AD1',
      },
      secondaryButtonShadow: {
        secondary: '', // Match spec
      },
      borderRadius: {
        card: '16px', // Task Card radius
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