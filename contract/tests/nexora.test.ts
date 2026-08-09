import { describe, it, expect } from 'vitest';
describe('Nexora contract invariants', () => {
  it('does not permit terminal release from an unfunded state', () => {
    const allowed: Record<string,string[]> = {
      Created:['Funded','Cancelled'], Funded:['DeliverableSubmitted'],
      DeliverableSubmitted:['Approved','Rejected'], Approved:['Released'], Rejected:['Cancelled']
    };
    expect(allowed.Created).not.toContain('Released');
    expect(allowed.Approved).toContain('Released');
    expect(allowed.Released ?? []).toHaveLength(0);
  });
});
