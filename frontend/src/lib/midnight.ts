import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';

export type MidnightContext = {
  connected: ConnectedAPI;
  networkId: string;
  providers: any;
  contract: any;
  address: string;
};

export async function createMidnightContext(connected: ConnectedAPI, secret: Uint8Array): Promise<MidnightContext> {
  const config = await connected.getConfiguration();
  setNetworkId(config.networkId as any);
  const zk = new FetchZkConfigProvider(window.location.origin + '/contract/', fetch.bind(window));
  const proof = httpClientProofProvider(config.proverServerUri ?? import.meta.env.VITE_PROOF_SERVER_URL, zk);
  const publicData = indexerPublicDataProvider(config.indexerUri, config.indexerWsUri);
  const addresses = await connected.getShieldedAddresses();
  const accountId = (await connected.getUnshieldedAddress()).unshieldedAddress;
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: 'nexora-private-state',
    accountId,
    privateStoragePasswordProvider: () => 'nexora-local-state-v1'
  });
  const walletProvider = {
    coinPublicKey: addresses.shieldedCoinPublicKey,
    encryptionPublicKey: addresses.shieldedEncryptionPublicKey,
    balanceTx: async (tx: any, newCoins: any) => {
      const { tx: balanced } = await connected.balanceUnsealedTransaction(tx, newCoins);
      return balanced;
    }
  };
  const midnightProvider = { submitTx: (tx: any) => connected.submitTransaction(tx) };
  const providers = { privateStateProvider, publicDataProvider: publicData, zkConfigProvider: zk, proofProvider: proof, walletProvider, midnightProvider };
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error('VITE_CONTRACT_ADDRESS is not configured. Deploy the Compact contract first.');
  const generated = await import('/contract/contract/index.cjs').catch(() => null);
  if (!generated) throw new Error('Compiled contract artifacts are missing. Run npm run contract:compile and copy the generated contract artifacts into frontend/public/contract.');
  const found = await import('@midnight-ntwrk/midnight-js-contracts').then(({ findDeployedContract }) => findDeployedContract(providers, { compiledContract: generated, contractAddress, privateStateId: 'nexora' }));
  return { connected, networkId: config.networkId, providers, contract: found, address: addresses.shieldedAddress };
}

export function requireContract(ctx: MidnightContext | null): MidnightContext { if (!ctx) throw new Error('Connect a Midnight wallet and configure the deployed Nexora contract first.'); return ctx; }
