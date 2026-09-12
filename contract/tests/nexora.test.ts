import { describe, it, expect, beforeEach } from 'vitest';
import { Contract, ledger } from '../managed/nexora/contract/index.js';
import type { Ledger } from '../managed/nexora/contract/index.js';
import {
  createConstructorContext,
  createCircuitContext,
  dummyContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import type { CircuitContext } from '@midnight-ntwrk/compact-runtime';

// ---------------------------------------------------------------------------
// Private state type (matches the witness signature)
// ---------------------------------------------------------------------------
type NexoraPrivateState = {
  secretKey: Uint8Array;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBytes32(s: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const enc = new TextEncoder();
  const encoded = enc.encode(s);
  bytes.set(encoded.slice(0, 32));
  return bytes;
}

const SECRET_KEY = toBytes32('nexora-test-secret-key-00000');
const COIN_PUB = 'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd';
const CONTRACT_ADDR = dummyContractAddress();

const ROLE = {
  Client: 1n,
  Contractor: 2n,
  Verifier: 3n,
  Orchestrator: 4n,
} as const;

const STATUS = {
  Created: 1n,
  Funded: 2n,
  DeliverableSubmitted: 3n,
  Approved: 5n,
  Rejected: 6n,
  Released: 7n,
  Cancelled: 8n,
} as const;

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

interface NexoraSimulator {
  contract: Contract<NexoraPrivateState>;
  ctx: CircuitContext<NexoraPrivateState>;
}

async function createSimulator(): Promise<NexoraSimulator> {
  const contract = new Contract<NexoraPrivateState>({
    localSecretKey: (witnessCtx) => [witnessCtx.privateState, SECRET_KEY],
  });

  const init = await contract.initialState(
    createConstructorContext<NexoraPrivateState>(
      { secretKey: SECRET_KEY },
      COIN_PUB,
    ),
  );

  const ctx = createCircuitContext<NexoraPrivateState>(
    '',
    CONTRACT_ADDR,
    init.currentZswapLocalState,
    init.currentContractState,
    init.currentPrivateState,
  );

  return { contract, ctx };
}

/** Read the Ledger from the current simulator context. */
function getLedger(sim: NexoraSimulator): Ledger {
  return ledger(sim.ctx.callContext.currentQueryContext.state);
}

/**
 * Call a circuit and update the simulator context in place.
 * This is critical: each circuit call returns a new context with the updated state.
 */
async function call<Args extends unknown[]>(
  sim: NexoraSimulator,
  circuitName: string,
  ...args: Args
): Promise<any> {
  const fn = (sim.contract.circuits as any)[circuitName];
  const result = await fn(sim.ctx, ...args);
  sim.ctx = result.context;
  return result;
}

// ---------------------------------------------------------------------------
// registerAgent tests
// ---------------------------------------------------------------------------

describe('registerAgent', () => {
  let sim: NexoraSimulator;

  beforeEach(async () => {
    sim = await createSimulator();
  });

  it('registers an agent with valid inputs', async () => {
    const agentId = toBytes32('agent-1');
    const nameCommit = toBytes32('name-alice');

    await call(sim, 'registerAgent', agentId, nameCommit, ROLE.Contractor);

    const ls = getLedger(sim);
    expect(ls.agents.member(agentId)).toBe(true);
    expect(ls.agentCount).toBe(1n);

    const agent = ls.agents.lookup(agentId);
    expect(agent.role).toBe(ROLE.Contractor);
    expect(agent.reputation).toBe(50n);
    expect(agent.successful).toBe(0n);
    expect(agent.unsuccessful).toBe(0n);
  });

  it('stores the commitment-based auth entry', async () => {
    const agentId = toBytes32('agent-auth');
    const nameCommit = toBytes32('nc-auth');

    await call(sim, 'registerAgent', agentId, nameCommit, ROLE.Client);

    const ls = getLedger(sim);
    expect(ls.agentAuth.member(agentId)).toBe(true);

    const authEntry = ls.agentAuth.lookup(agentId);
    expect(authEntry).toBeInstanceOf(Uint8Array);
    expect(authEntry.length).toBe(32);
  });

  it('increments agentCount', async () => {
    await call(sim, 'registerAgent', toBytes32('a1'), toBytes32('n1'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('a2'), toBytes32('n2'), ROLE.Verifier);

    const ls = getLedger(sim);
    expect(ls.agentCount).toBe(2n);
  });

  it('rejects duplicate agent registration', async () => {
    const agentId = toBytes32('dup-agent');

    await call(sim, 'registerAgent', agentId, toBytes32('n1'), ROLE.Contractor);

    await expect(
      call(sim, 'registerAgent', agentId, toBytes32('n2'), ROLE.Client),
    ).rejects.toThrow('Agent already registered');
  });

  it('rejects role = 0 (below minimum)', async () => {
    const agentId = toBytes32('bad-role');

    await expect(
      call(sim, 'registerAgent', agentId, toBytes32('n'), 0n),
    ).rejects.toThrow('Invalid role');
  });

  it('rejects role = 5 (above maximum)', async () => {
    const agentId = toBytes32('bad-role-2');

    await expect(
      call(sim, 'registerAgent', agentId, toBytes32('n'), 5n),
    ).rejects.toThrow('Invalid role');
  });
});

// ---------------------------------------------------------------------------
// createPolicy tests
// ---------------------------------------------------------------------------

describe('createPolicy', () => {
  let sim: NexoraSimulator;

  beforeEach(async () => {
    sim = await createSimulator();
  });

  it('creates a policy with valid inputs', async () => {
    const policyId = toBytes32('policy-1');
    const nameCommit = toBytes32('policy-name');

    await call(sim, 'createPolicy', policyId, nameCommit, 70n, 10n, 500n, ROLE.Contractor, true, true);

    const ls = getLedger(sim);
    expect(ls.policies.member(policyId)).toBe(true);
    expect(ls.policyCount).toBe(1n);

    const policy = ls.policies.lookup(policyId);
    expect(policy.minReputation).toBe(70n);
    expect(policy.minPayment).toBe(10n);
    expect(policy.maxPayment).toBe(500n);
    expect(policy.requiredRole).toBe(ROLE.Contractor);
    expect(policy.verifierRequired).toBe(true);
    expect(policy.approvalRequired).toBe(true);
  });

  it('rejects duplicate policy', async () => {
    const policyId = toBytes32('dup-policy');
    const nc = toBytes32('nc');

    await call(sim, 'createPolicy', policyId, nc, 50n, 1n, 100n, ROLE.Contractor, false, false);

    await expect(
      call(sim, 'createPolicy', policyId, nc, 50n, 1n, 100n, ROLE.Contractor, false, false),
    ).rejects.toThrow('Policy already exists');
  });

  it('rejects minPayment > maxPayment', async () => {
    const policyId = toBytes32('bad-range');

    await expect(
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 1000n, 1n, ROLE.Contractor, false, false),
    ).rejects.toThrow('Invalid payment range');
  });

  it('rejects minReputation > 100', async () => {
    const policyId = toBytes32('bad-rep');

    await expect(
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 101n, 1n, 100n, ROLE.Contractor, false, false),
    ).rejects.toThrow('Invalid reputation threshold');
  });

  it('rejects invalid required role (0)', async () => {
    const policyId = toBytes32('bad-role');

    await expect(
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 1n, 100n, 0n, false, false),
    ).rejects.toThrow('Invalid role');
  });

  it('accepts boundary: minReputation = 100', async () => {
    const policyId = toBytes32('rep-100');

    await call(sim, 'createPolicy', policyId, toBytes32('nc'), 100n, 1n, 100n, ROLE.Contractor, false, false);

    const ls = getLedger(sim);
    expect(ls.policies.member(policyId)).toBe(true);
  });

  it('accepts boundary: minPayment = maxPayment', async () => {
    const policyId = toBytes32('same-pay');

    await call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 100n, 100n, ROLE.Contractor, false, false);

    const ls = getLedger(sim);
    expect(ls.policies.member(policyId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createEscrow tests
// ---------------------------------------------------------------------------

describe('createEscrow', () => {
  let sim: NexoraSimulator;

  beforeEach(async () => {
    sim = await createSimulator();

    // Register 3 agents, chaining context each time
    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    // Create a policy
    await call(sim, 'createPolicy', toBytes32('policy-1'), toBytes32('pol-name'), 50n, 10n, 500n, ROLE.Contractor, true, true);
  });

  it('creates an escrow with valid inputs', async () => {
    const escrowId = toBytes32('escrow-1');

    await call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n);

    const ls = getLedger(sim);
    expect(ls.escrows.member(escrowId)).toBe(true);
    expect(ls.escrowCount).toBe(1n);

    const escrow = ls.escrows.lookup(escrowId);
    expect(escrow.status).toBe(STATUS.Created);
    expect(escrow.amount).toBe(100n);
    expect(escrow.approved).toBe(false);
  });

  it('rejects escrow if client is not registered', async () => {
    const escrowId = toBytes32('escrow-no-client');

    await expect(
      call(sim, 'createEscrow', escrowId, toBytes32('unknown-client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).rejects.toThrow('Agent is not registered');
  });

  it('rejects escrow if contractor reputation is below policy minimum', async () => {
    // Create a policy requiring reputation 80
    await call(sim, 'createPolicy', toBytes32('high-rep-policy'), toBytes32('hr'), 80n, 1n, 1000n, ROLE.Contractor, false, false);

    // Register a new contractor with default rep 50
    await call(sim, 'registerAgent', toBytes32('low-rep-ct'), toBytes32('lr'), ROLE.Contractor);

    await expect(
      call(sim, 'createEscrow', toBytes32('escrow-low-rep'), toBytes32('client'), toBytes32('low-rep-ct'), toBytes32('verifier'), toBytes32('high-rep-policy'), 100n),
    ).rejects.toThrow('Contractor reputation below policy minimum');
  });

  it('rejects escrow if amount violates policy range', async () => {
    await expect(
      call(sim, 'createEscrow', toBytes32('escrow-bad-amount'), toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 5n),
    ).rejects.toThrow('Payment violates policy');
  });

  it('rejects escrow if contractor role does not match policy', async () => {
    // Policy requires Contractor (2), register a Verifier (3)
    await call(sim, 'registerAgent', toBytes32('verifier-as-ct'), toBytes32('v-as-ct'), ROLE.Verifier);

    await expect(
      call(sim, 'createEscrow', toBytes32('escrow-role-mismatch'), toBytes32('client'), toBytes32('verifier-as-ct'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).rejects.toThrow('Contractor role violates policy');
  });

  it('rejects escrow if verifier == contractor when policy requires verifier', async () => {
    await expect(
      call(sim, 'createEscrow', toBytes32('escrow-same-ver'), toBytes32('client'), toBytes32('contractor'), toBytes32('contractor'), toBytes32('policy-1'), 100n),
    ).rejects.toThrow('Verifier must be independent');
  });

  it('rejects escrow if policy does not exist', async () => {
    await expect(
      call(sim, 'createEscrow', toBytes32('escrow-no-policy'), toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('nonexistent-policy'), 100n),
    ).rejects.toThrow('Policy not found');
  });

  it('rejects duplicate escrow ID', async () => {
    const escrowId = toBytes32('dup-escrow');

    await call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n);

    await expect(
      call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).rejects.toThrow('Escrow already exists');
  });
});

// ---------------------------------------------------------------------------
// Escrow lifecycle: submitDeliverable, approveDeliverable, rejectDeliverable
// ---------------------------------------------------------------------------

describe('escrow lifecycle', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-lc');

  beforeEach(async () => {
    sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('policy-lc'), toBytes32('plc'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    await call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-lc'), 200n);
  });

  it('submitDeliverable rejects when escrow is Created (not Funded)', async () => {
    await expect(
      call(sim, 'submitDeliverable', ESCROW_ID, toBytes32('deliverable-hash')),
    ).rejects.toThrow('Escrow is not funded');
  });

  it('approveDeliverable rejects when escrow is Created', async () => {
    await expect(
      call(sim, 'approveDeliverable', ESCROW_ID),
    ).rejects.toThrow('Escrow is not ready for verification');
  });

  it('rejectDeliverable rejects when escrow is Created', async () => {
    await expect(
      call(sim, 'rejectDeliverable', ESCROW_ID),
    ).rejects.toThrow('Escrow is not under verification');
  });

  it('approveDeliverable rejects for non-existent escrow', async () => {
    await expect(
      call(sim, 'approveDeliverable', toBytes32('nonexistent')),
    ).rejects.toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// cancelEscrow tests
// ---------------------------------------------------------------------------

describe('cancelEscrow', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-cancel');

  beforeEach(async () => {
    sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('policy-cancel'), toBytes32('pc'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    await call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-cancel'), 100n);
  });

  it('cancels an escrow in Created state', async () => {
    await call(sim, 'cancelEscrow', ESCROW_ID);

    const ls = getLedger(sim);
    const escrow = ls.escrows.lookup(ESCROW_ID);
    expect(escrow.status).toBe(STATUS.Cancelled);
  });

  it('rejects cancellation of a non-existent escrow', async () => {
    await expect(
      call(sim, 'cancelEscrow', toBytes32('nonexistent')),
    ).rejects.toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// getAgent, getPolicy, getEscrow (read-only queries)
// ---------------------------------------------------------------------------

describe('read-only queries', () => {
  let sim: NexoraSimulator;

  beforeEach(async () => {
    sim = await createSimulator();
  });

  it('getAgent returns registered agent data', async () => {
    const agentId = toBytes32('agent-ro');
    await call(sim, 'registerAgent', agentId, toBytes32('nc-ro'), ROLE.Orchestrator);

    const result = await call(sim, 'getAgent', agentId);
    expect(result.result.role).toBe(ROLE.Orchestrator);
    expect(result.result.reputation).toBe(50n);
  });

  it('getAgent throws for unknown agent', async () => {
    await expect(
      call(sim, 'getAgent', toBytes32('no-such-agent')),
    ).rejects.toThrow('Agent not found');
  });

  it('getPolicy returns registered policy data', async () => {
    const policyId = toBytes32('policy-ro');
    await call(sim, 'createPolicy', policyId, toBytes32('nc-pro'), 30n, 5n, 200n, ROLE.Client, false, true);

    const result = await call(sim, 'getPolicy', policyId);
    expect(result.result.minReputation).toBe(30n);
    expect(result.result.minPayment).toBe(5n);
    expect(result.result.maxPayment).toBe(200n);
    expect(result.result.requiredRole).toBe(ROLE.Client);
    expect(result.result.verifierRequired).toBe(false);
    expect(result.result.approvalRequired).toBe(true);
  });

  it('getPolicy throws for unknown policy', async () => {
    await expect(
      call(sim, 'getPolicy', toBytes32('no-such-policy')),
    ).rejects.toThrow('Policy not found');
  });

  it('getEscrow returns registered escrow data', async () => {
    await call(sim, 'registerAgent', toBytes32('c1'), toBytes32('nc1'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('ct1'), toBytes32('nct1'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('v1'), toBytes32('nv1'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('p1'), toBytes32('np1'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    const escrowId = toBytes32('escrow-ro');
    await call(sim, 'createEscrow', escrowId, toBytes32('c1'), toBytes32('ct1'), toBytes32('v1'), toBytes32('p1'), 250n);

    const result = await call(sim, 'getEscrow', escrowId);
    expect(result.result.amount).toBe(250n);
    expect(result.result.status).toBe(STATUS.Created);
    expect(result.result.approved).toBe(false);
  });

  it('getEscrow throws for unknown escrow', async () => {
    await expect(
      call(sim, 'getEscrow', toBytes32('no-such-escrow')),
    ).rejects.toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// updateReputation tests
// ---------------------------------------------------------------------------

describe('updateReputation', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-rep');

  beforeEach(async () => {
    sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('policy-rep'), toBytes32('pr'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    await call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-rep'), 100n);
  });

  it('rejects updateReputation on an escrow not in final state', async () => {
    await expect(
      call(sim, 'updateReputation', ESCROW_ID, true),
    ).rejects.toThrow('Settlement outcome is not final');
  });

  it('rejects updateReputation for non-existent escrow', async () => {
    await expect(
      call(sim, 'updateReputation', toBytes32('nonexistent'), true),
    ).rejects.toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// fundEscrow and releaseEscrow (token operations)
// ---------------------------------------------------------------------------

describe('fundEscrow (token operations)', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-fund');

  beforeEach(async () => {
    sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('policy-fund'), toBytes32('pf'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    await call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-fund'), 100n);
  });

  it('rejects fundEscrow for non-existent escrow', async () => {
    await expect(
      call(sim, 'fundEscrow', toBytes32('nonexistent'), 100n),
    ).rejects.toThrow('Escrow not found');
  });

  it('rejects fundEscrow if amount does not match escrow amount', async () => {
    await expect(
      call(sim, 'fundEscrow', ESCROW_ID, 999n),
    ).rejects.toThrow('Funding amount does not match escrow');
  });
});

describe('releaseEscrow (token operations)', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-rel');

  beforeEach(async () => {
    sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    await call(sim, 'createPolicy', toBytes32('policy-rel'), toBytes32('prl'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    await call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-rel'), 100n);
  });

  it('rejects releaseEscrow for non-existent escrow', async () => {
    const addr = { bytes: toBytes32('contractor-addr') };
    await expect(
      call(sim, 'releaseEscrow', toBytes32('nonexistent'), addr),
    ).rejects.toThrow('Escrow not found');
  });

  it('rejects releaseEscrow when escrow is Created (not Approved)', async () => {
    const addr = { bytes: toBytes32('contractor-addr') };
    await expect(
      call(sim, 'releaseEscrow', ESCROW_ID, addr),
    ).rejects.toThrow('Escrow is not approved');
  });
});

// ---------------------------------------------------------------------------
// Privacy tests
//
// The witness `localSecretKey()` is the only private input in this contract.
// These tests prove it never appears in public ledger state or in any
// circuit return value — only the commitment (authCommitment) does.
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

describe('privacy: witness secret never leaks', () => {
  let sim: NexoraSimulator;

  beforeEach(async () => {
    sim = await createSimulator();
  });

  function secretHex(): string {
    return bytesToHex(SECRET_KEY);
  }

  it('agentAuth stores a hash commitment, not the raw secret key', async () => {
    const agentId = toBytes32('privacy-agent');
    await call(sim, 'registerAgent', agentId, toBytes32('nc-priv'), ROLE.Client);

    const ls = getLedger(sim);
    const authEntry = ls.agentAuth.lookup(agentId);

    // The public commitment must never equal the raw secret bytes.
    expect(bytesEqual(authEntry, SECRET_KEY)).toBe(false);
  });

  it('no public ledger entry contains the raw secret key as a substring', async () => {
    const agentId = toBytes32('privacy-agent-2');
    await call(sim, 'registerAgent', agentId, toBytes32('nc-priv-2'), ROLE.Verifier);
    await call(sim, 'createPolicy', toBytes32('privacy-policy'), toBytes32('pp'), 10n, 1n, 100n, ROLE.Verifier, false, false);

    const ls = getLedger(sim);
    const secret = secretHex();

    const authEntry = ls.agentAuth.lookup(agentId);
    expect(bytesToHex(authEntry)).not.toContain(secret);

    const agent = ls.agents.lookup(agentId);
    expect(bytesToHex(agent.nameCommitment)).not.toContain(secret);
  });

  it('the same secret key produces different commitments for different agent IDs (domain separation)', async () => {
    const agentA = toBytes32('agent-priv-a');
    const agentB = toBytes32('agent-priv-b');

    await call(sim, 'registerAgent', agentA, toBytes32('nc-a'), ROLE.Client);
    await call(sim, 'registerAgent', agentB, toBytes32('nc-b'), ROLE.Client);

    const ls = getLedger(sim);
    const authA = ls.agentAuth.lookup(agentA);
    const authB = ls.agentAuth.lookup(agentB);

    // Same underlying secret, different agent IDs -> different public
    // commitments. An observer comparing two entries learns nothing about
    // the shared secret or about a link between the two agents.
    expect(bytesEqual(authA, authB)).toBe(false);
  });

  it('circuit return values never expose the raw secret key', async () => {
    const agentId = toBytes32('privacy-agent-3');
    await call(sim, 'registerAgent', agentId, toBytes32('nc-priv-3'), ROLE.Contractor);

    const result = await call(sim, 'getAgent', agentId);

    const serialized = JSON.stringify(result.result, (_key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value instanceof Uint8Array
          ? bytesToHex(value)
          : value,
    );
    expect(serialized).not.toContain(secretHex());
  });
});

// ---------------------------------------------------------------------------
// Ledger state integrity tests
// ---------------------------------------------------------------------------

describe('ledger state integrity', () => {
  it('starts with empty ledger', async () => {
    const sim = await createSimulator();
    const ls = getLedger(sim);

    expect(ls.agents.isEmpty()).toBe(true);
    expect(ls.policies.isEmpty()).toBe(true);
    expect(ls.escrows.isEmpty()).toBe(true);
    expect(ls.agentCount).toBe(0n);
    expect(ls.policyCount).toBe(0n);
    expect(ls.escrowCount).toBe(0n);
  });

  it('agents map and counter stay in sync', async () => {
    const sim = await createSimulator();

    await call(sim, 'registerAgent', toBytes32('a1'), toBytes32('n1'), ROLE.Client);
    await call(sim, 'registerAgent', toBytes32('a2'), toBytes32('n2'), ROLE.Contractor);
    await call(sim, 'registerAgent', toBytes32('a3'), toBytes32('n3'), ROLE.Verifier);

    const ls = getLedger(sim);
    expect(ls.agentCount).toBe(3n);
    expect(ls.agents.size()).toBe(3n);
    expect(ls.agents.member(toBytes32('a1'))).toBe(true);
    expect(ls.agents.member(toBytes32('a2'))).toBe(true);
    expect(ls.agents.member(toBytes32('a3'))).toBe(true);
    expect(ls.agents.member(toBytes32('a4'))).toBe(false);
  });

  it('policies map and counter stay in sync', async () => {
    const sim = await createSimulator();

    await call(sim, 'createPolicy', toBytes32('p1'), toBytes32('np1'), 50n, 1n, 100n, ROLE.Contractor, false, false);
    await call(sim, 'createPolicy', toBytes32('p2'), toBytes32('np2'), 30n, 5n, 200n, ROLE.Client, true, true);

    const ls = getLedger(sim);
    expect(ls.policyCount).toBe(2n);
    expect(ls.policies.size()).toBe(2n);
  });
});
