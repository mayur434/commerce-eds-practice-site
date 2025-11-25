// aes-util.mjs
import CryptoJS from 'crypto-js';

/**
 * AesUtil class (same API as your original browser code)
 */
class AesUtil {
  constructor(keySize, iterationCount) {
    // keySize expected in bits (e.g. 128, 192, 256)
    this.keySize = keySize / 32; // CryptoJS wants keySize in words (32 bits each)
    this.iterationCount = iterationCount;
  }

  generateKey(saltHex, passPhrase) {
    return CryptoJS.PBKDF2(
      passPhrase,
      CryptoJS.enc.Hex.parse(saltHex),
      { keySize: this.keySize, iterations: this.iterationCount }
    );
  }

  encrypt(saltHex, ivHex, passPhrase, plainText) {
    const key = this.generateKey(saltHex, passPhrase);
    const encrypted = CryptoJS.AES.encrypt(
      plainText,
      key,
      { iv: CryptoJS.enc.Hex.parse(ivHex) }
    );
    // return ciphertext as Base64 string (same output shape as your browser version)
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  }

  decrypt(saltHex, ivHex, passPhrase, cipherTextBase64) {
    const key = this.generateKey(saltHex, passPhrase);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(cipherTextBase64)
    });
    const decrypted = CryptoJS.AES.decrypt(
      cipherParams,
      key,
      { iv: CryptoJS.enc.Hex.parse(ivHex) }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}

/**
 * Factory to create AesUtil instances (keeps your original API style)
 */
function AesUtilFactory(keySize = 128, iterationCount = 10000) {
  return new AesUtil(keySize, iterationCount);
}

/**
 * Default config (same defaults as your browser code)
 */
function getDefaultConfig() {
  return {
    keySize: 128,
    iterationCount: 10000,
    iv: CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex),
    salt: CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex),
    passPhrase: "vs@123"
  };
}

/**
 * Normalize base64: trim, remove quotes/whitespace, convert url-safe, add padding.
 */
function normalizeBase64(input) {
  if (!input || typeof input !== 'string') return input;
  let s = input.trim();

  // Remove surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }

  // Remove whitespace/newlines
  s = s.replace(/\s+/g, '');

  // URL-safe -> standard base64
  s = s.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed (length must be multiple of 4)
  const pad = s.length % 4;
  if (pad === 1) {
    // invalid length for base64, but we'll return anyway to let decode throw or fallback
  } else if (pad > 0) {
    s += '='.repeat(4 - pad);
  }
  return s;
}

/**
 * Browser-safe base64 decode to UTF-8 string with fallbacks.
 */
function getDecodedString(encodedString) {
  const normalized = normalizeBase64(encodedString);

  // Try browser atob first
  if (typeof atob === 'function') {
    try {
      const binaryString = atob(normalized);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      // fall through to Buffer fallback
    }
  }

  // Node / Buffer fallback
  if (typeof Buffer !== 'undefined') {
    try {
      const buf = Buffer.from(normalized, 'base64');
      return buf.toString('utf8');
    } catch (err) {
      // fall through to error
    }
  }

  throw new Error('Failed to base64-decode input: not valid base64 after normalization.');
}

/**
 * Browser-safe base64 encode from UTF-8 string.
 * Avoids String.fromCharCode(...bytes) spread usage.
 */
function makeBase64String(config, cipherText) {
  const combined = `${config.keySize}::${config.iterationCount}::${config.iv}::${config.salt}::${cipherText}`;

  // Encode combined UTF-8 string to bytes
  const bytes = new TextEncoder('utf-8').encode(combined);

  // Build a binary string from bytes in a safe loop (no spread / apply).
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Use btoa (or Buffer fallback in Node) to get base64
  return (typeof btoa === 'function')
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Parse the wrapper and return config + cipherText
 * Handles cipherText that may contain '::' by joining remaining parts.
 */
function extractConfig(wrappedBase64) {
  const decodedString = getDecodedString(wrappedBase64);
  const parts = decodedString.split('::');

  if (parts.length < 5) {
    // Not the wrapper format we expect
    throw new Error(`Decoded wrapper has unexpected format (expected >=5 parts). Decoded value: ${decodedString}`);
  }

  return {
    keySize: parseInt(parts[0], 10),
    iterationCount: parseInt(parts[1], 10),
    iv: parts[2],
    salt: parts[3],
    passPhrase: getDefaultConfig().passPhrase,
    cipherText: parts.slice(4).join('::') // join rest in case ciphertext contains ::
  };
}

/**
 * High-level helper that uses default config and returns a wrapped base64 string.
 * Accepts strings or objects (objects will be JSON.stringify'ed).
 */
function encryptData(data) {
  const config = getDefaultConfig();
  const aes = AesUtilFactory(config.keySize, config.iterationCount);
  const plainText = (typeof data === 'string') ? data : JSON.stringify(data);
  const cipherTextBase64 = aes.encrypt(config.salt, config.iv, config.passPhrase, plainText);
  return makeBase64String(config, cipherTextBase64);
}

/**
 * High-level helper that unwraps the base64 wrapper and decrypts the payload.
 * Returns the plain string (caller may JSON.parse if needed).
 */
function decryptData(wrappedBase64) {
  try {
    const config = extractConfig(wrappedBase64);
    const aes = AesUtilFactory(config.keySize, config.iterationCount);
    return aes.decrypt(config.salt, config.iv, config.passPhrase, config.cipherText);
  } catch (err) {
    throw new Error(`decryptData failed: ${err.message}. Input preview: ${typeof wrappedBase64 === 'string' ? wrappedBase64.slice(0,200) : String(wrappedBase64)}`);
  }
}

/**
 * Exports
 */
export { AesUtilFactory as AesUtil };
export { encryptData, decryptData };
