// Ensure EXPO_PUBLIC_USE_RN_FETCH is present when Metro/babel inline env vars
// (babel-preset-expo >= 56.0.17). EAS Build also sets this via eas.json.
process.env.EXPO_PUBLIC_USE_RN_FETCH ??= '1';

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
