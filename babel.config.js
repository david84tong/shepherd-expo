module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }], 
      'nativewind/babel'
    ],
    plugins: [
      // Important: react-native-reanimated/plugin must be the last plugin
      'react-native-reanimated/plugin',
    ],
  };
};
