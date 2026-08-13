import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';

import {
  nexoraContractWithAssets,
  type NexoraPrivateState,
} from './nexoraContract';

export async function deployNexora(
  connected: ConnectedAPI,
  providers: any,
  initialPrivateState: NexoraPrivateState,
) {
  if (!connected) {
    throw new Error('Midnight wallet is not connected.');
  }

  if (!providers) {
    throw new Error('Midnight providers are not initialized.');
  }

  const deployed = await deployContract(
    providers,
    {
      compiledContract: nexoraContractWithAssets as any,
      privateStateId: 'nexora',
      initialPrivateState,
    } as any,
  );

  return deployed;
}
