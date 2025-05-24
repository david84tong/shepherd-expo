const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('riv');
config.resolver["assetExts"] = [
    ...(config.resolver.assetExts || []),
    // for rive animations
    "riv",
  ];

module.exports = withNativeWind(config, { input: './global.css' });