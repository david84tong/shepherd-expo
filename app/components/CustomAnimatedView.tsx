import React from 'react';
import Animated from 'react-native-reanimated';

interface CustomViewProps {
  children: React.ReactNode;
  style?: any;
  className?: string;
}

// Render Animated.View unconditionally so animated styles created with
// `useAnimatedStyle` are always supported.  Individual screens already respect
// the reduced-motion setting by skipping animation drivers, so simply mounting
// the animated component is safe and prevents blank screens when motion is
// disabled.
const CustomAnimatedView: React.FC<CustomViewProps> = ({ children, style, className }) => (
  <Animated.View style={style} className={className}>
    {children}
  </Animated.View>
);

export default CustomAnimatedView;
