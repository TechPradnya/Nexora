import {
  CompiledContract,
} from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import {
  Contract,
} from '../generated/nexora/contract/index.js';

export type NexoraPrivateState = {
  localSecretKey: Uint8Array;
};

function getLocalSecretKey(): Uint8Array {
  const hex = import.meta.env.VITE_NEXORA_LOCAL_SECRET_KEY;

  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'VITE_NEXORA_LOCAL_SECRET_KEY must be a 32-byte hexadecimal value.',
    );
  }

  const bytes = new Uint8Array(32);

  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

export function createNexoraPrivateState(): NexoraPrivateState {
  return {
    localSecretKey: getLocalSecretKey(),
  };
}

const compiled = CompiledContract.make(
  'nexora',
  Contract,
);

export const nexoraContract =
  CompiledContract.withWitnesses(
    compiled,
    {
      localSecretKey: (
        context: {
          privateState: NexoraPrivateState;
        },
      ) => {
        const state = context.privateState;

        if (
          !state ||
          !(state.localSecretKey instanceof Uint8Array) ||
          state.localSecretKey.length !== 32
        ) {
          throw new Error(
            'Nexora private state does not contain a valid localSecretKey.',
          );
        }

        return [
          state,
          state.localSecretKey,
        ];
      },
    },
  );

export const nexoraContractWithAssets =
  CompiledContract.withCompiledFileAssets(
    nexoraContract,
    '/contract/managed/nexora',
  );
