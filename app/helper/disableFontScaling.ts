import { Text, TextInput } from 'react-native';

export const disableFontScaling = () => {
  const TextComponent = Text as any;
  const TextInputComponent = TextInput as any;

  TextComponent.defaultProps = TextComponent.defaultProps || {};
  TextInputComponent.defaultProps = TextInputComponent.defaultProps || {};

  TextComponent.defaultProps.allowFontScaling = false;
  TextInputComponent.defaultProps.allowFontScaling = false;
};

// Default export for Expo Router compatibility
export default {}
