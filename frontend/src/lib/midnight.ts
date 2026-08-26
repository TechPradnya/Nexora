import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  Transaction,
  type SignatureEnabled,
  type Proof,
  type Binding,
} from '@midnight-ntwrk/ledger-v8';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Contract } from '../contracts/nexora-compiled.js';

export type MidnightContext = {
  connected: ConnectedAPI;
  networkId: string;
  providers: any;
  contract: any;
  address: string;
};

export async function createMidnightContext(
  connected: ConnectedAPI,
  secret: Uint8Array,
): Promise<MidnightContext> {
  // Keep Midnight SDK packages lazy-loaded.
  // This allows the frontend UI to start without initializing
  // the complete Midnight stack.
  const [
    { setNetworkId },
    { FetchZkConfigProvider },
    { httpClientProofProvider },
    { indexerPublicDataProvider },
    { levelPrivateStateProvider },
    { findDeployedContract },
  ] = await Promise.all([
    import('@midnight-ntwrk/midnight-js-network-id'),
    import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider'),
    import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
    import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
    import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
    import('@midnight-ntwrk/midnight-js-contracts'),
  ]);

  const config = await connected.getConfiguration();

  setNetworkId(config.networkId as any);

  /*
   * ZK configuration
   */
  const zk = new FetchZkConfigProvider(
    `${window.location.origin}/contract/`,
    fetch.bind(window),
  );

  /*
   * Proof provider
   */
  const proof = httpClientProofProvider(
    config.proverServerUri ??
      import.meta.env.VITE_PROOF_SERVER_URL,
    zk,
  );

  /*
   * Public blockchain/indexer data
   */
  const publicData = indexerPublicDataProvider(
    config.indexerUri,
    config.indexerWsUri,
  );

  /*
   * Wallet addresses
   */
  const addresses =
    await connected.getShieldedAddresses();

  const accountId =
    (
      await connected.getUnshieldedAddress()
    ).unshieldedAddress;

  /*
   * Private state provider
   */
  const privateStateProvider =
    levelPrivateStateProvider({
      privateStateStoreName:
        'nexora-private-state',

      accountId,

      privateStoragePasswordProvider: () =>
        'nexora-local-state-v1',
    });

  /*
   * Wallet provider
   */
  const walletProvider = {
    getCoinPublicKey: () =>
      addresses.shieldedCoinPublicKey,

    getEncryptionPublicKey: () =>
      addresses.shieldedEncryptionPublicKey,

    balanceTx: async (tx: any, _ttl?: Date) => {
      const serialized = toHex(tx.serialize());

      const balanced =
        await connected.balanceUnsealedTransaction(
          serialized,
          {},
        );

      return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
        'signature',
        'proof',
        'binding',
        fromHex(balanced.tx),
      );
    },
  };

  /*
   * Midnight transaction provider
   */
  const midnightProvider = {
    submitTx: async (tx: any) => {
      await connected.submitTransaction(
        toHex(tx.serialize()),
      );

      return tx.identifiers()[0];
    },
  };

  /*
   * Complete Midnight provider configuration
   */
  const providers = {
    privateStateProvider,
    publicDataProvider: publicData,
    zkConfigProvider: zk,
    proofProvider: proof,
    walletProvider,
    midnightProvider,
  };

  /*
   * Deployed Nexora contract address
   */
  const contractAddress =
    import.meta.env.VITE_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error(
      'VITE_CONTRACT_ADDRESS is not configured. ' +
        'Deploy the Compact contract first.',
    );
  }

  /*
   * The generated Compact contract artifact is imported
   * at build time via Vite's module graph. This allows
   * Vite to resolve the @midnight-ntwrk/compact-runtime
   * bare specifier that the generated contract depends on.
   *
   * ZK proof artifacts (prover/verifier keys, bzkir files)
   * are served at runtime from frontend/public/contract/.
   */
  const compiledContract = CompiledContract.make(
    'nexora',
    Contract,
  ) as any;

  /*
   * Find the deployed Nexora contract.
   */
  const found = await findDeployedContract(
    providers as any,
    {
      compiledContract,
      contractAddress,
      privateStateId: 'nexora',
    },
  );

  return {
    connected,
    networkId: config.networkId,
    providers,
    contract: found,
    address: addresses.shieldedAddress,
  };
}

/*
 * Require a valid Midnight contract context before
 * performing blockchain operations.
 */
export function requireContract(
  ctx: MidnightContext | null,
): MidnightContext {
  if (!ctx) {
    throw new Error(
      'Connect a Midnight wallet and configure the deployed Nexora contract first.',
    );
  }

  return ctx;
}