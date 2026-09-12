import { Contract } from './managed/nexora/contract/index.js';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';
import * as ocrt from '@midnightntwrk/onchain-runtime-v4';

const contract = new Contract({
  localSecretKey: (ctx) => [ctx.privateState, new Uint8Array(32)],
});

const init = contract.initialState(
  createConstructorContext(
    { secretKey: new Uint8Array(32) },
    'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd',
  ),
);

const cs = init.currentContractState;
console.log('typeof:', typeof cs);
console.log('constructor.name:', cs?.constructor?.name);
console.log('is ocrt.ContractState:', cs instanceof ocrt.ContractState);
console.log('is ocrt.ChargedState:', cs instanceof ocrt.ChargedState);
console.log('is ocrt.StateValue:', cs instanceof ocrt.StateValue);
console.log('keys:', cs ? Object.keys(cs) : null);

// Which onchain-runtime is compact-runtime itself using?
import { createCircuitContext } from '@midnight-ntwrk/compact-runtime';
console.log('runtime module resolved from:', await import.meta.resolve('@midnight-ntwrk/compact-runtime'));
console.log('onchain-runtime-v4 resolved from:', await import.meta.resolve('@midnightntwrk/onchain-runtime-v4'));
