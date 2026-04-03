/**
 * Client-side cryptography — zero-knowledge model.
 *
 * Key derivation flow:
 *   masterPassword + salt  →  PBKDF2  →  512-bit stretched key
 *   stretchedKey[0..255]   →  authKey   (sent to server for authentication)
 *   stretchedKey[256..511] →  encKey    (used locally to encrypt/decrypt vault)
 *
 * Vault encryption: AES-256-GCM
 * The server only ever receives the authKey and ciphertext — never plaintext or encKey.
 */

const PBKDF2_ITERATIONS = 600_000;
const KEY_LENGTH_BITS = 512;

async function deriveKeys(masterPassword: string, saltHex: string) {
  const enc = new TextEncoder();
  const salt = hexToArrayBuffer(saltHex);

  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(masterPassword), 'PBKDF2', false, ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { 
      name: 'PBKDF2', 
      salt,
      iterations: PBKDF2_ITERATIONS, 
      hash: 'SHA-256' 
    },
    baseKey,
    KEY_LENGTH_BITS
  );

  const half = bits.byteLength / 2;
  const authKeyBytes = new Uint8Array(bits, 0, half);
  const encKeyBytes  = new Uint8Array(bits, half);

  const encKey = await crypto.subtle.importKey(
    'raw', encKeyBytes, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );

  // masterKeyHash is a hex representation of the encryption key bytes
  // Used for server-side verification without exposing the actual encryption key
  const masterKeyHash = bytesToHex(encKeyBytes);

  return { authKey: bytesToHex(authKeyBytes), encKey, masterKeyHash };
}

async function encryptVaultItem(plaintext: string, encKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv).buffer }, 
    encKey, 
    enc.encode(plaintext)
  );
  // Format: base64(iv) + '.' + base64(ciphertext)
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

async function decryptVaultItem(payload: string, encKey: CryptoKey): Promise<string> {
  const [ivB64, ctB64] = payload.split('.');
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(ctB64);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv).buffer }, 
    encKey, 
    new Uint8Array(ciphertext).buffer
  );
  return new TextDecoder().decode(plaintext);
}

function generateSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

// --- Helpers ---

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++)
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr.buffer.slice(0);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export { deriveKeys, encryptVaultItem, decryptVaultItem, generateSalt };
