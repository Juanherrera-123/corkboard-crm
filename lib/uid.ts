
/**
 * Generate a unique identifier using the platform's crypto API when available,
 * falling back to a simple random string.
 */
export function uid(): string {
  // Prefer the Web Crypto API if present (available in modern browsers and Node 19+)
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: generate a RFC4122 v4–like ID using random numbers
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return (
    toHex(bytes[0]) +
    toHex(bytes[1]) +
    toHex(bytes[2]) +
    toHex(bytes[3]) +
    '-' +
    toHex(bytes[4]) +
    toHex(bytes[5]) +
    '-' +
    toHex(bytes[6]) +
    toHex(bytes[7]) +
    '-' +
    toHex(bytes[8]) +
    toHex(bytes[9]) +
    '-' +
    toHex(bytes[10]) +
    toHex(bytes[11]) +
    toHex(bytes[12]) +
    toHex(bytes[13]) +
    toHex(bytes[14]) +
    toHex(bytes[15])
  );
}
