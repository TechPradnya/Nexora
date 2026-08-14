export async function sha256Bytes(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await sha256Bytes(value);
  return Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');

  if (clean.length !== 64 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error('Expected a 32-byte hexadecimal value.');
  }

  const bytes = new Uint8Array(32);

  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

export function randomHex(bytes = 32): string {
  const out = new Uint8Array(bytes);
  crypto.getRandomValues(out);
  return Array.from(out, b => b.toString(16).padStart(2, '0')).join('');
}
