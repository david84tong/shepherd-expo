import { Platform, ViewStyle } from 'react-native';

// Define shadow presets based on your tailwind config
export const shadowPresets = {
  buttonShadow: {
    color: '#FFE4A8',
    offset: { width: 0, height: 5.716 },
    radius: 0,
  },
  blueButtonShadow: {
    color: '#98E1FE',
    offset: { width: 0, height: 5.716 },
    radius: 0,
  },
  backButton: {
    color: '#FFE4A8',
    offset: { width: 0, height: 5.716 },
    radius: 0,
  },
  appleShadow: {
    color: 'rgb(67, 67, 67)',
    offset: { width: 0, height: 5.716 },
    radius: 0,
  },
  greyShadow: {
    color: '#98A1AE',
    offset: { width: 0, height: 5.716 },
    radius: 0,
  },
  card: {
    color: 'rgba(0,0,0,0.08)',
    offset: { width: 0, height: 2 },
    radius: 4,
  },
  // Path shadows
  darkYellow: {
    color: '#F7B500',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkRed: {
    color: '#E64132',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkGreen: {
    color: '#24CA17',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkOrange: {
    color: '#FF8C1A',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkTeal: {
    color: '#17CABC',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkPurple: {
    color: '#7B2BFF',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkPink: {
    color: '#E6319E',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkCrimson: {
    color: '#C81E28',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkIndigo: {
    color: '#3040FF',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkBlue: {
    color: '#2196F3',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkCyan: {
    color: '#18B2B6',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkScarlet: {
    color: '#D72618',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  gray: {
    color: '#808080',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
  darkApple: {
    color: '#171717',
    offset: { width: 0, height: 5 },
    radius: 0,
  },
} as const;

export type ShadowPresetName = keyof typeof shadowPresets;

/**
 * Get platform-specific shadow styles
 * @param preset - The shadow preset name from tailwind config
 * @param elevation - Android elevation (defaults to 6)
 * @returns Platform-specific shadow styles
 */
export const getShadowStyle = (
  preset: ShadowPresetName,
  elevation: number = 6
): ViewStyle => {
  const shadow = shadowPresets[preset];
  
  return Platform.select({
    ios: {
      shadowColor: shadow.color,
      shadowOffset: shadow.offset,
      shadowOpacity: 1,
      shadowRadius: shadow.radius || 0,
    },
    android: {
      elevation,
    },
  }) || {};
};

/**
 * Get custom shadow style with specific parameters
 * @param color - Shadow color
 * @param offset - Shadow offset
 * @param opacity - Shadow opacity (iOS only)
 * @param radius - Shadow radius (iOS only)
 * @param elevation - Android elevation
 * @returns Platform-specific shadow styles
 */
export const getCustomShadow = (
  color: string,
  offset: { width: number; height: number },
  opacity: number = 1,
  radius: number = 0,
  elevation: number = 6
): ViewStyle => {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: offset,
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
  }) || {};
}; 