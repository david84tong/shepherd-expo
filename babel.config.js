module.exports = function (api) {
  api.cache(true);
  const plugins = [
    // NOTE: this must be the last plugin
    'react-native-reanimated/plugin',
  ];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
