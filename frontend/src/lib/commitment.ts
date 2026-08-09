export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export function randomHex(bytes = 32): string {
  const out = new Uint8Array(bytes); crypto.getRandomValues(out);
  return Array.from(out, b => b.toString(16).padStart(2, '0')).join('');
}
