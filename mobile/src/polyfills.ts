import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';

// Neon Auth / better-auth call crypto.randomUUID() at module load on globalThis.
// expo-standard-web-crypto only patches window and lacks randomUUID.
const shim = {
  getRandomValues: ExpoCrypto.getRandomValues,
  randomUUID: ExpoCrypto.randomUUID,
} as Crypto;

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = shim;
} else {
  if (typeof globalThis.crypto.getRandomValues !== 'function') {
    globalThis.crypto.getRandomValues = ExpoCrypto.getRandomValues;
  }
  if (typeof globalThis.crypto.randomUUID !== 'function') {
    globalThis.crypto.randomUUID = ExpoCrypto.randomUUID;
  }
}
