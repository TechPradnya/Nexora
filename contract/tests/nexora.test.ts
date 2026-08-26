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

function createSimulator(): NexoraSimulator {
  const contract = new Contract<NexoraPrivateState>({
    localSecretKey: (witnessCtx) => [witnessCtx.privateState, SECRET_KEY],
  });

  const init = contract.initialState(
    createConstructorContext<NexoraPrivateState>(
      { secretKey: SECRET_KEY },
      COIN_PUB,
    ),
  );

  const ctx = createCircuitContext<NexoraPrivateState>(
    CONTRACT_ADDR,
    init.currentZswapLocalState,
    init.currentContractState,
    init.currentPrivateState,
  );

  return { contract, ctx };
}

/** Read the Ledger from the current simulator context. */
function getLedger(sim: NexoraSimulator): Ledger {
  return ledger(sim.ctx.currentQueryContext.state);
}

/**
 * Call a circuit and update the simulator context in place.
 * This is critical: each circuit call returns a new context with the updated state.
 */
function call<Args extends unknown[]>(
  sim: NexoraSimulator,
  circuitName: string,
  ...args: Args
): any {
  const fn = (sim.contract.circuits as any)[circuitName];
  const result = fn(sim.ctx, ...args);
  sim.ctx = result.context;
  return result;
}

// ---------------------------------------------------------------------------
// registerAgent tests
// ---------------------------------------------------------------------------

describe('registerAgent', () => {
  let sim: NexoraSimulator;

  beforeEach(() => {
    sim = createSimulator();
  });

  it('registers an agent with valid inputs', () => {
    const agentId = toBytes32('agent-1');
    const nameCommit = toBytes32('name-alice');

    call(sim, 'registerAgent', agentId, nameCommit, ROLE.Contractor);

    const ls = getLedger(sim);
    expect(ls.agents.member(agentId)).toBe(true);
    expect(ls.agentCount).toBe(1n);

    const agent = ls.agents.lookup(agentId);
    expect(agent.role).toBe(ROLE.Contractor);
    expect(agent.reputation).toBe(50n);
    expect(agent.successful).toBe(0n);
    expect(agent.unsuccessful).toBe(0n);
  });

  it('stores the commitment-based auth entry', () => {
    const agentId = toBytes32('agent-auth');
    const nameCommit = toBytes32('nc-auth');

    call(sim, 'registerAgent', agentId, nameCommit, ROLE.Client);

    const ls = getLedger(sim);
    expect(ls.agentAuth.member(agentId)).toBe(true);

    const authEntry = ls.agentAuth.lookup(agentId);
    expect(authEntry).toBeInstanceOf(Uint8Array);
    expect(authEntry.length).toBe(32);
  });

  it('increments agentCount', () => {
    call(sim, 'registerAgent', toBytes32('a1'), toBytes32('n1'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('a2'), toBytes32('n2'), ROLE.Verifier);

    const ls = getLedger(sim);
    expect(ls.agentCount).toBe(2n);
  });

  it('rejects duplicate agent registration', () => {
    const agentId = toBytes32('dup-agent');

    call(sim, 'registerAgent', agentId, toBytes32('n1'), ROLE.Contractor);

    expect(() =>
      call(sim, 'registerAgent', agentId, toBytes32('n2'), ROLE.Client),
    ).toThrow('Agent already registered');
  });

  it('rejects role = 0 (below minimum)', () => {
    const agentId = toBytes32('bad-role');

    expect(() =>
      call(sim, 'registerAgent', agentId, toBytes32('n'), 0n),
    ).toThrow('Invalid role');
  });

  it('rejects role = 5 (above maximum)', () => {
    const agentId = toBytes32('bad-role-2');

    expect(() =>
      call(sim, 'registerAgent', agentId, toBytes32('n'), 5n),
    ).toThrow('Invalid role');
  });
});

// ---------------------------------------------------------------------------
// createPolicy tests
// ---------------------------------------------------------------------------

describe('createPolicy', () => {
  let sim: NexoraSimulator;

  beforeEach(() => {
    sim = createSimulator();
  });

  it('creates a policy with valid inputs', () => {
    const policyId = toBytes32('policy-1');
    const nameCommit = toBytes32('policy-name');

    call(sim, 'createPolicy', policyId, nameCommit, 70n, 10n, 500n, ROLE.Contractor, true, true);

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

  it('rejects duplicate policy', () => {
    const policyId = toBytes32('dup-policy');
    const nc = toBytes32('nc');

    call(sim, 'createPolicy', policyId, nc, 50n, 1n, 100n, ROLE.Contractor, false, false);

    expect(() =>
      call(sim, 'createPolicy', policyId, nc, 50n, 1n, 100n, ROLE.Contractor, false, false),
    ).toThrow('Policy already exists');
  });

  it('rejects minPayment > maxPayment', () => {
    const policyId = toBytes32('bad-range');

    expect(() =>
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 1000n, 1n, ROLE.Contractor, false, false),
    ).toThrow('Invalid payment range');
  });

  it('rejects minReputation > 100', () => {
    const policyId = toBytes32('bad-rep');

    expect(() =>
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 101n, 1n, 100n, ROLE.Contractor, false, false),
    ).toThrow('Invalid reputation threshold');
  });

  it('rejects invalid required role (0)', () => {
    const policyId = toBytes32('bad-role');

    expect(() =>
      call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 1n, 100n, 0n, false, false),
    ).toThrow('Invalid role');
  });

  it('accepts boundary: minReputation = 100', () => {
    const policyId = toBytes32('rep-100');

    call(sim, 'createPolicy', policyId, toBytes32('nc'), 100n, 1n, 100n, ROLE.Contractor, false, false);

    const ls = getLedger(sim);
    expect(ls.policies.member(policyId)).toBe(true);
  });

  it('accepts boundary: minPayment = maxPayment', () => {
    const policyId = toBytes32('same-pay');

    call(sim, 'createPolicy', policyId, toBytes32('nc'), 50n, 100n, 100n, ROLE.Contractor, false, false);

    const ls = getLedger(sim);
    expect(ls.policies.member(policyId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createEscrow tests
// ---------------------------------------------------------------------------

describe('createEscrow', () => {
  let sim: NexoraSimulator;

  beforeEach(() => {
    sim = createSimulator();

    // Register 3 agents, chaining context each time
    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    // Create a policy
    call(sim, 'createPolicy', toBytes32('policy-1'), toBytes32('pol-name'), 50n, 10n, 500n, ROLE.Contractor, true, true);
  });

  it('creates an escrow with valid inputs', () => {
    const escrowId = toBytes32('escrow-1');

    call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n);

    const ls = getLedger(sim);
    expect(ls.escrows.member(escrowId)).toBe(true);
    expect(ls.escrowCount).toBe(1n);

    const escrow = ls.escrows.lookup(escrowId);
    expect(escrow.status).toBe(STATUS.Created);
    expect(escrow.amount).toBe(100n);
    expect(escrow.approved).toBe(false);
  });

  it('rejects escrow if client is not registered', () => {
    const escrowId = toBytes32('escrow-no-client');

    expect(() =>
      call(sim, 'createEscrow', escrowId, toBytes32('unknown-client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).toThrow('Agent is not registered');
  });

  it('rejects escrow if contractor reputation is below policy minimum', () => {
    // Create a policy requiring reputation 80
    call(sim, 'createPolicy', toBytes32('high-rep-policy'), toBytes32('hr'), 80n, 1n, 1000n, ROLE.Contractor, false, false);

    // Register a new contractor with default rep 50
    call(sim, 'registerAgent', toBytes32('low-rep-ct'), toBytes32('lr'), ROLE.Contractor);

    expect(() =>
      call(sim, 'createEscrow', toBytes32('escrow-low-rep'), toBytes32('client'), toBytes32('low-rep-ct'), toBytes32('verifier'), toBytes32('high-rep-policy'), 100n),
    ).toThrow('Contractor reputation below policy minimum');
  });

  it('rejects escrow if amount violates policy range', () => {
    expect(() =>
      call(sim, 'createEscrow', toBytes32('escrow-bad-amount'), toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 5n),
    ).toThrow('Payment violates policy');
  });

  it('rejects escrow if contractor role does not match policy', () => {
    // Policy requires Contractor (2), register a Verifier (3)
    call(sim, 'registerAgent', toBytes32('verifier-as-ct'), toBytes32('v-as-ct'), ROLE.Verifier);

    expect(() =>
      call(sim, 'createEscrow', toBytes32('escrow-role-mismatch'), toBytes32('client'), toBytes32('verifier-as-ct'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).toThrow('Contractor role violates policy');
  });

  it('rejects escrow if verifier == contractor when policy requires verifier', () => {
    expect(() =>
      call(sim, 'createEscrow', toBytes32('escrow-same-ver'), toBytes32('client'), toBytes32('contractor'), toBytes32('contractor'), toBytes32('policy-1'), 100n),
    ).toThrow('Verifier must be independent');
  });

  it('rejects escrow if policy does not exist', () => {
    expect(() =>
      call(sim, 'createEscrow', toBytes32('escrow-no-policy'), toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('nonexistent-policy'), 100n),
    ).toThrow('Policy not found');
  });

  it('rejects duplicate escrow ID', () => {
    const escrowId = toBytes32('dup-escrow');

    call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n);

    expect(() =>
      call(sim, 'createEscrow', escrowId, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-1'), 100n),
    ).toThrow('Escrow already exists');
  });
});

// ---------------------------------------------------------------------------
// Escrow lifecycle: submitDeliverable, approveDeliverable, rejectDeliverable
// ---------------------------------------------------------------------------

describe('escrow lifecycle', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-lc');

  beforeEach(() => {
    sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('policy-lc'), toBytes32('plc'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-lc'), 200n);
  });

  it('submitDeliverable rejects when escrow is Created (not Funded)', () => {
    expect(() =>
      call(sim, 'submitDeliverable', ESCROW_ID, toBytes32('deliverable-hash')),
    ).toThrow('Escrow is not funded');
  });

  it('approveDeliverable rejects when escrow is Created', () => {
    expect(() =>
      call(sim, 'approveDeliverable', ESCROW_ID),
    ).toThrow('Escrow is not ready for verification');
  });

  it('rejectDeliverable rejects when escrow is Created', () => {
    expect(() =>
      call(sim, 'rejectDeliverable', ESCROW_ID),
    ).toThrow('Escrow is not under verification');
  });

  it('approveDeliverable rejects for non-existent escrow', () => {
    expect(() =>
      call(sim, 'approveDeliverable', toBytes32('nonexistent')),
    ).toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// cancelEscrow tests
// ---------------------------------------------------------------------------

describe('cancelEscrow', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-cancel');

  beforeEach(() => {
    sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('policy-cancel'), toBytes32('pc'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-cancel'), 100n);
  });

  it('cancels an escrow in Created state', () => {
    call(sim, 'cancelEscrow', ESCROW_ID);

    const ls = getLedger(sim);
    const escrow = ls.escrows.lookup(ESCROW_ID);
    expect(escrow.status).toBe(STATUS.Cancelled);
  });

  it('rejects cancellation of a non-existent escrow', () => {
    expect(() =>
      call(sim, 'cancelEscrow', toBytes32('nonexistent')),
    ).toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// getAgent, getPolicy, getEscrow (read-only queries)
// ---------------------------------------------------------------------------

describe('read-only queries', () => {
  let sim: NexoraSimulator;

  beforeEach(() => {
    sim = createSimulator();
  });

  it('getAgent returns registered agent data', () => {
    const agentId = toBytes32('agent-ro');
    call(sim, 'registerAgent', agentId, toBytes32('nc-ro'), ROLE.Orchestrator);

    const result = call(sim, 'getAgent', agentId);
    expect(result.result.role).toBe(ROLE.Orchestrator);
    expect(result.result.reputation).toBe(50n);
  });

  it('getAgent throws for unknown agent', () => {
    expect(() =>
      call(sim, 'getAgent', toBytes32('no-such-agent')),
    ).toThrow('Agent not found');
  });

  it('getPolicy returns registered policy data', () => {
    const policyId = toBytes32('policy-ro');
    call(sim, 'createPolicy', policyId, toBytes32('nc-pro'), 30n, 5n, 200n, ROLE.Client, false, true);

    const result = call(sim, 'getPolicy', policyId);
    expect(result.result.minReputation).toBe(30n);
    expect(result.result.minPayment).toBe(5n);
    expect(result.result.maxPayment).toBe(200n);
    expect(result.result.requiredRole).toBe(ROLE.Client);
    expect(result.result.verifierRequired).toBe(false);
    expect(result.result.approvalRequired).toBe(true);
  });

  it('getPolicy throws for unknown policy', () => {
    expect(() =>
      call(sim, 'getPolicy', toBytes32('no-such-policy')),
    ).toThrow('Policy not found');
  });

  it('getEscrow returns registered escrow data', () => {
    call(sim, 'registerAgent', toBytes32('c1'), toBytes32('nc1'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('ct1'), toBytes32('nct1'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('v1'), toBytes32('nv1'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('p1'), toBytes32('np1'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    const escrowId = toBytes32('escrow-ro');
    call(sim, 'createEscrow', escrowId, toBytes32('c1'), toBytes32('ct1'), toBytes32('v1'), toBytes32('p1'), 250n);

    const result = call(sim, 'getEscrow', escrowId);
    expect(result.result.amount).toBe(250n);
    expect(result.result.status).toBe(STATUS.Created);
    expect(result.result.approved).toBe(false);
  });

  it('getEscrow throws for unknown escrow', () => {
    expect(() =>
      call(sim, 'getEscrow', toBytes32('no-such-escrow')),
    ).toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// updateReputation tests
// ---------------------------------------------------------------------------

describe('updateReputation', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-rep');

  beforeEach(() => {
    sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('policy-rep'), toBytes32('pr'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-rep'), 100n);
  });

  it('rejects updateReputation on an escrow not in final state', () => {
    expect(() =>
      call(sim, 'updateReputation', ESCROW_ID, true),
    ).toThrow('Settlement outcome is not final');
  });

  it('rejects updateReputation for non-existent escrow', () => {
    expect(() =>
      call(sim, 'updateReputation', toBytes32('nonexistent'), true),
    ).toThrow('Escrow not found');
  });
});

// ---------------------------------------------------------------------------
// fundEscrow and releaseEscrow (token operations)
// ---------------------------------------------------------------------------

describe('fundEscrow (token operations)', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-fund');

  beforeEach(() => {
    sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('policy-fund'), toBytes32('pf'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-fund'), 100n);
  });

  it('rejects fundEscrow for non-existent escrow', () => {
    expect(() =>
      call(sim, 'fundEscrow', toBytes32('nonexistent'), 100n),
    ).toThrow('Escrow not found');
  });

  it('rejects fundEscrow if amount does not match escrow amount', () => {
    expect(() =>
      call(sim, 'fundEscrow', ESCROW_ID, 999n),
    ).toThrow('Funding amount does not match escrow');
  });
});

describe('releaseEscrow (token operations)', () => {
  let sim: NexoraSimulator;
  const ESCROW_ID = toBytes32('escrow-rel');

  beforeEach(() => {
    sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('client'), toBytes32('nc-c'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('contractor'), toBytes32('nc-ct'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('verifier'), toBytes32('nc-v'), ROLE.Verifier);

    call(sim, 'createPolicy', toBytes32('policy-rel'), toBytes32('prl'), 50n, 10n, 500n, ROLE.Contractor, true, true);

    call(sim, 'createEscrow', ESCROW_ID, toBytes32('client'), toBytes32('contractor'), toBytes32('verifier'), toBytes32('policy-rel'), 100n);
  });

  it('rejects releaseEscrow for non-existent escrow', () => {
    const addr = { bytes: toBytes32('contractor-addr') };
    expect(() =>
      call(sim, 'releaseEscrow', toBytes32('nonexistent'), addr),
    ).toThrow('Escrow not found');
  });

  it('rejects releaseEscrow when escrow is Created (not Approved)', () => {
    const addr = { bytes: toBytes32('contractor-addr') };
    expect(() =>
      call(sim, 'releaseEscrow', ESCROW_ID, addr),
    ).toThrow('Escrow is not approved');
  });
});

// ---------------------------------------------------------------------------
// Ledger state integrity tests
// ---------------------------------------------------------------------------

describe('ledger state integrity', () => {
  it('starts with empty ledger', () => {
    const sim = createSimulator();
    const ls = getLedger(sim);

    expect(ls.agents.isEmpty()).toBe(true);
    expect(ls.policies.isEmpty()).toBe(true);
    expect(ls.escrows.isEmpty()).toBe(true);
    expect(ls.agentCount).toBe(0n);
    expect(ls.policyCount).toBe(0n);
    expect(ls.escrowCount).toBe(0n);
  });

  it('agents map and counter stay in sync', () => {
    const sim = createSimulator();

    call(sim, 'registerAgent', toBytes32('a1'), toBytes32('n1'), ROLE.Client);
    call(sim, 'registerAgent', toBytes32('a2'), toBytes32('n2'), ROLE.Contractor);
    call(sim, 'registerAgent', toBytes32('a3'), toBytes32('n3'), ROLE.Verifier);

    const ls = getLedger(sim);
    expect(ls.agentCount).toBe(3n);
    expect(ls.agents.size()).toBe(3n);
    expect(ls.agents.member(toBytes32('a1'))).toBe(true);
    expect(ls.agents.member(toBytes32('a2'))).toBe(true);
    expect(ls.agents.member(toBytes32('a3'))).toBe(true);
    expect(ls.agents.member(toBytes32('a4'))).toBe(false);
  });

  it('policies map and counter stay in sync', () => {
    const sim = createSimulator();

    call(sim, 'createPolicy', toBytes32('p1'), toBytes32('np1'), 50n, 1n, 100n, ROLE.Contractor, false, false);
    call(sim, 'createPolicy', toBytes32('p2'), toBytes32('np2'), 30n, 5n, 200n, ROLE.Client, true, true);

    const ls = getLedger(sim);
    expect(ls.policyCount).toBe(2n);
    expect(ls.policies.size()).toBe(2n);
  });
});
