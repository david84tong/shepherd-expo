const { withNativeWind } = require('nativewind/metro');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getSentryExpoConfig(__dirname);
config.resolver.assetExts.push('riv');
config.resolver['assetExts'] = [
  ...(config.resolver.assetExts || []),
  // for rive animations
  'riv',
];

module.exports = withNativeWind(config, { input: './global.css' });