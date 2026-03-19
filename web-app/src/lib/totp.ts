/**
 * RFC 6238 TOTP — runs entirely in the browser, no server involved.
 * Supports base32-encoded secrets (standard for authenticator apps).
 */

function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

export async function generateTOTP(secret: string, digits = 6): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const keyBytes = base32Decode(secret);
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { counterBytes[i] = c & 0xff; c >>= 8; }

  const key = await crypto.subtle.importKey(
    'raw', keyBytes.buffer.slice(0) as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));
  const offset = sig[sig.length - 1] & 0x0f;
  const code = ((sig[offset] & 0x7f) << 24 | sig[offset+1] << 16 | sig[offset+2] << 8 | sig[offset+3]) % (10 ** digits);
  return code.toString().padStart(digits, '0');
}

/** Seconds remaining in the current 30-second window */
export function totpSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}
