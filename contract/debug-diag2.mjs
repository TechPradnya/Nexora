import { Contract } from './managed/nexora/contract/index.js';
import { createConstructorContext } from '@midnight-ntwrk/compact-runtime';

const contract = new Contract({
  localSecretKey: (ctx) => [ctx.privateState, new Uint8Array(32)],
});

const init = contract.initialState(
  createConstructorContext(
    { secretKey: new Uint8Array(32) },
    'aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd',
  ),
);

console.log('init is:', init);
console.log('Object.keys(init):', Object.keys(init));
console.log('typeof init:', typeof init);
