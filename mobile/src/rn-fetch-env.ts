/**
 * Must load before `expo` so WinterCG fetch is not installed.
 *
 * On babel-preset-expo < 56.0.17, EXPO_PUBLIC_USE_RN_FETCH is not inlined inside
 * node_modules, so production builds still read process.env at runtime (and miss
 * eas.json). Setting it here before `import 'expo'` keeps RN's XHR fetch.
 *
 * See: expo/expo#46981, expo/expo#45592
 */
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';
