import { describe, it, expect } from 'vitest';
import { hexToBytes, sha256Bytes, sha256Hex } from './commitment';

describe('commitment helpers', () => {
  it('returns a deterministic 32-byte hash', async () => {
    const a = await sha256Hex('nexora');
    const b = await sha256Hex('nexora');

    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('produces different commitments for different inputs', async () => {
    const first = await sha256Hex('agent-secret-a');
    const second = await sha256Hex('agent-secret-b');

    expect(first).not.toBe(second);
  });

  it('returns exactly 32 bytes from sha256Bytes', async () => {
    const digest = await sha256Bytes('nexora privacy test');

    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest).toHaveLength(32);
  });

  it('converts a valid 32-byte hexadecimal commitment to bytes', () => {
    const hex = '00'.repeat(32);
    const bytes = hexToBytes(hex);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(32);
    expect(Array.from(bytes).every((byte) => byte === 0)).toBe(true);
  });

  it('rejects invalid commitment lengths and characters', () => {
    expect(() => hexToBytes('abcd')).toThrow(
      'Expected a 32-byte hexadecimal value.',
    );

    expect(() => hexToBytes(`${'00'.repeat(31)}gg`)).toThrow(
      'Expected a 32-byte hexadecimal value.',
    );
  });
});
