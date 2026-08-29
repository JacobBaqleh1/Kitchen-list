module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Hermes V1 (SDK 56) keeps native async/await; that path has resolved
    // fetch Promises to undefined on iOS (expo/expo#45592). Force generators.
    plugins: ['@babel/plugin-transform-async-to-generator'],
  };
};
