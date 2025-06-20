import { AccessibilityInfo } from 'react-native';

let isReduceMotionEnabled = false;

// Initialize the reduce motion state
AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  isReduceMotionEnabled = enabled;
});

// Listen for changes to reduce motion setting
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  isReduceMotionEnabled = enabled;
});

export const getAnimationConfig = (config: {
  duration?: number;
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
}) => {
  if (isReduceMotionEnabled) {
    // Return minimal animation config when reduce motion is enabled
    return {
      duration: 0,
      delay: 0,
      damping: 100,
      stiffness: 100,
      mass: 1,
    };
  }
  return config;
};

export const shouldAnimate = () => !isReduceMotionEnabled; 