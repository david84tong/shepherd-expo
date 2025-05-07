const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { FileStore } = require('metro-cache');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname, {
  // Tell Expo Router to ignore specific patterns in the app directory
  // These files are not routes - they're utilities, hooks, models, etc.
  resolver: {
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['react-native', 'require', 'import'],
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],
  },
});

// Add .riv to assetExts for Rive animations
config.resolver.assetExts.push('riv');

// Explicitly exclude non-route files
config.resolver.blockList = [
  /\/app\/api\/.*/,
  /\/app\/hooks\/.*/,
  /\/app\/models\/.*/,
  /\/app\/stores\/.*/,
  /\/app\/types\/.*/,
  /\/app\/utils\/.*/,
];

module.exports = withNativeWind(config, { input: './global.css' });
