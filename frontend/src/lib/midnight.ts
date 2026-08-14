import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  Transaction,
  type SignatureEnabled,
  type Proof,
  type Binding,
} from '@midnight-ntwrk/ledger-v8';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';

export type MidnightProviders = {
  privateStateProvider: any;
  publicDataProvider: any;
  zkConfigProvider: any;
  proofProvider: any;
  walletProvider: any;
  midnightProvider: any;
};

export type MidnightContext = {
  connected: ConnectedAPI;
  networkId: string;
  providers: MidnightProviders;
  contract?: any;
  address: string;
};

export async function createMidnightProviders(
  connected: ConnectedAPI,
): Promise<{
  networkId: string;
  providers: MidnightProviders;
  address: string;
}> {
  const [
    { setNetworkId },
    { FetchZkConfigProvider },
    { httpClientProofProvider },
    { indexerPublicDataProvider },
    { levelPrivateStateProvider },
  ] = await Promise.all([
    import('@midnight-ntwrk/midnight-js-network-id'),
    import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider'),
    import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
    import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
    import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
  ]);

  const config = await connected.getConfiguration();

  setNetworkId(config.networkId as any);

  const zk = new FetchZkConfigProvider(
    `${window.location.origin}/contract/managed/nexora/`,
    async (input, init) => {
      const originalUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const decodedUrl = decodeURIComponent(originalUrl);

      const folder = decodedUrl.includes('/zkir/')
        ? 'zkir'
        : 'keys';

      const filename = decodedUrl
        .split('/')
        .pop() || '';

      const circuitName = filename.includes('#')
        ? filename.split('#').pop() || filename
        : filename;

      const correctedUrl =
        `${window.location.origin}/contract/managed/nexora/${folder}/${encodeURIComponent(circuitName)}`;

      console.log(
        '[Nexora] ZK artifact request:',
        originalUrl,
        '=>',
        correctedUrl,
      );

      return fetch(correctedUrl, init);
    },
  );

  const proof = httpClientProofProvider(
    config.proverServerUri ??
      import.meta.env.VITE_PROOF_SERVER_URL,
    zk,
  );

  const publicData = indexerPublicDataProvider(
    config.indexerUri,
    config.indexerWsUri,
  );

  const addresses =
    await connected.getShieldedAddresses();

  const accountId =
    (
      await connected.getUnshieldedAddress()
    ).unshieldedAddress;

  const privateStateProvider =
    levelPrivateStateProvider({
      privateStateStoreName:
        'nexora-private-state',
      accountId,
      privateStoragePasswordProvider: () =>
        import.meta.env.VITE_PRIVATE_STATE_PASSWORD || '',
    });

  const walletProvider = {
    getCoinPublicKey: () =>
      addresses.shieldedCoinPublicKey,

    getEncryptionPublicKey: () =>
      addresses.shieldedEncryptionPublicKey,

    balanceTx: async (
      tx: any,
      _ttl?: Date,
    ) => {
      const serialized = toHex(
        tx.serialize(),
      );

      const balanced =
        await connected.balanceUnsealedTransaction(
          serialized,
          {},
        );

      return Transaction.deserialize<
        SignatureEnabled,
        Proof,
        Binding
      >(
        'signature',
        'proof',
        'binding',
        fromHex(balanced.tx),
      );
    },
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      await connected.submitTransaction(
        toHex(tx.serialize()),
      );

      return tx.identifiers()[0];
    },
  };

  return {
    networkId: config.networkId,
    address: addresses.shieldedAddress,
    providers: {
      privateStateProvider,
      publicDataProvider: publicData,
      zkConfigProvider: zk,
      proofProvider: proof,
      walletProvider,
      midnightProvider,
    },
  };
}

export async function createMidnightContext(
  connected: ConnectedAPI,
): Promise<MidnightContext> {
  const base =
    await createMidnightProviders(
      connected,
    );

  const contractAddress =
    import.meta.env.VITE_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error(
      'VITE_CONTRACT_ADDRESS is not configured. ' +
      'Deploy the Nexora contract first.',
    );
  }

  const {
    findDeployedContract,
  } = await import(
    '@midnight-ntwrk/midnight-js-contracts'
  );

  const { CompiledContract } =
    await import(
      '@midnight-ntwrk/midnight-js-protocol/compact-js'
    );

  const {
    nexoraContractWithAssets,
  } = await import(
    './nexoraContract'
  );

  const found =
    await findDeployedContract(
      base.providers,
      {
        compiledContract:
          nexoraContractWithAssets,
        contractAddress,
        privateStateId: 'nexora',
      },
    );

  return {
    connected,
    networkId: base.networkId,
    providers: base.providers,
    contract: found,
    address: base.address,
  };
}

export function requireContract(
  ctx: MidnightContext | null,
): MidnightContext {
  if (!ctx?.contract) {
    throw new Error(
      'Connect a Midnight wallet and configure the deployed Nexora contract first.',
    );
  }

  return ctx;
}
