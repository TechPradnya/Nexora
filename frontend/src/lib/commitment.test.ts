import { describe, it, expect } from 'vitest';
import { sha256Hex } from './commitment';
describe('commitment helpers',()=>{it('returns a deterministic 32-byte hash',async()=>{const a=await sha256Hex('nexora');const b=await sha256Hex('nexora');expect(a).toBe(b);expect(a).toHaveLength(64);});});
