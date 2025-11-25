// checkPincode.js
import { decryptData, encryptData } from './aes-util.mjs';

/**
 * Helper to attempt decrypt and parse JSON if possible.
 * Throws if decryptData throws.
 */
function tryDecryptSafely(wrapped) {
  // normalize: remove surrounding quotes and whitespace
  if (typeof wrapped === 'string') {
    wrapped = wrapped.trim();
    if ((wrapped.startsWith('"') && wrapped.endsWith('"')) ||
        (wrapped.startsWith("'") && wrapped.endsWith("'"))) {
      wrapped = wrapped.slice(1, -1);
    }
  }

  // decryptData throws a descriptive error on failure
  const plain = decryptData(wrapped);

  // Attempt JSON parse
  try {
    return JSON.parse(plain);
  } catch {
    return plain;
  }
}

/**
 * Extract candidate encrypted string from a parsed JSON object.
 * Looks for common fields.
 */
function extractEncryptedFieldFromJson(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  // Common field names that APIs use for wrapped payloads
  const candidates = ['response', 'data', 'result', 'body', 'payload'];

  for (const key of candidates) {
    if (typeof parsed[key] === 'string' && parsed[key].trim().length > 0) {
      return parsed[key];
    }
  }

  // If parsed has a nested structure, try shallow scan for string values
  for (const k of Object.keys(parsed)) {
    if (typeof parsed[k] === 'string' && parsed[k].trim().length > 0) {
      return parsed[k];
    }
  }

  return null;
}

/**
 * Main exported function for pincode check
 */
export async function checkPincode(pincode) {
  if (!/^\d{6}$/.test(pincode)) {
    throw new Error('❌ Invalid pincode format. Must be 6 digits.');
  }

  const parseBody = { header: {}, body: { pincode } };
  const encryptedData = encryptData(parseBody);
  console.log('🔐 encryptedData preview:', encryptedData.slice(0, 200) + (encryptedData.length > 200 ? '...' : ''));

  const payload = { data: encryptedData };

  try {
    const res = await fetch('https://stage-mdm.vijaysales.com/web/api/oms-api/check-pincode/v1', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Origin': 'https://stage.vijaysales.com',
        'Referer': 'https://stage.vijaysales.com/',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(`HTTP ${res.status} ${res.statusText}. Response preview: ${text ? text.slice(0,200) : '<<no body>>'}`);
    }

    // Read raw response text
    let rawText = await res.text();
    console.log('📦 Raw API response length:', rawText?.length);
    console.log('📦 Raw API response preview:', rawText ? rawText.slice(0, 300) : rawText);

    rawText = rawText ? rawText.trim() : rawText;

    // If it's JSON-like string, parse it and attempt to extract a wrapped field
    if (rawText && (rawText.startsWith('{') || rawText.startsWith('['))) {
      try {
        const parsed = JSON.parse(rawText);
        console.log('🔎 Parsed JSON response:', parsed);

        const candidate = extractEncryptedFieldFromJson(parsed);

        if (candidate) {
          console.log('🔑 Found encrypted field in JSON (preview):', (candidate || '').slice(0,200));
          try {
            const decrypted = tryDecryptSafely(candidate);
            console.log('✅ Decrypted and parsed response:', decrypted);
            return decrypted;
          } catch (err) {
            console.warn('⚠️ decrypt failed for JSON field:', err.message);
            // fallthrough to try other strategies
          }
        } else {
          // No candidate field found — maybe server returned already-decrypted object
          console.log('ℹ️ No encrypted field found in server JSON. Returning parsed object.');
          return parsed;
        }
      } catch (err) {
        console.warn('⚠️ JSON.parse failed (unexpected):', err);
        // continue to other heuristics
      }
    }

    // If rawText is quoted string (like "\"MTI4...\"" ), remove quotes
    let candidate = rawText;
    if (candidate && ((candidate.startsWith('"') && candidate.endsWith('"')) || (candidate.startsWith("'") && candidate.endsWith("'")))) {
      candidate = candidate.slice(1, -1);
      console.log('ℹ️ Removed surrounding quotes from candidate.');
    }

    // Try to decrypt candidate directly
    if (candidate) {
      try {
        const decrypted = tryDecryptSafely(candidate);
        console.log('✅ Decrypted direct candidate:', decrypted);
        return decrypted;
      } catch (err) {
        console.warn('⚠️ decrypt failed for direct candidate:', err.message);
      }
    }

    // Last-ditch: try to base64-decode candidate (maybe server returned inner ciphertext only)
    if (candidate) {
      try {
        const normalized = candidate.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const maybeBinary = (typeof atob === 'function') ? atob(normalized) : Buffer.from(normalized, 'base64').toString('binary');

        const bytes = new Uint8Array(maybeBinary.length);
        for (let i = 0; i < maybeBinary.length; i++) bytes[i] = maybeBinary.charCodeAt(i);
        const text = new TextDecoder('utf-8').decode(bytes);
        console.log('ℹ️ Decoded base64 (no wrapper) preview:', text.slice(0,200));

        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (err) {
        console.warn('⚠️ Fallback base64 decode failed:', err.message);
      }
    }

    // If all attempts fail, return rawText for debugging
    console.warn('❗ Could not decrypt or parse server response — returning raw text for inspection.');
    return rawText;
  } catch (error) {
    console.error('🚨 Pincode check failed:', error);
    throw error;
  }
}
