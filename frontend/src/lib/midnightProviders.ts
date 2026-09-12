import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  Transaction,
  type SignatureEnabled,
  type Proof,
  type Binding,
} from '@midnight-ntwrk/ledger-v8';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';

export async function createMidnightProviders(
  connected: ConnectedAPI,
) {
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

      const marker =
        `/contract/managed/nexora/${folder}/`;

      const markerIndex =
        decodedUrl.indexOf(marker);

      if (markerIndex === -1) {
        throw new Error(
          `[Nexora] Invalid ZK artifact URL: ${originalUrl}`,
        );
      }

      let filename =
        decodedUrl.slice(
          markerIndex + marker.length,
        );

      filename = filename.split('?')[0];

      if (filename.startsWith('nexora#')) {
        filename =
          filename.slice('nexora#'.length);
      }

      const correctedUrl =
        `${window.location.origin}/contract/managed/nexora/${folder}/${encodeURIComponent(filename)}`;

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

  const publicData =
    indexerPublicDataProvider(
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
        import.meta.env
          .VITE_PRIVATE_STATE_PASSWORD || '',
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
      const serialized =
        toHex(tx.serialize());

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
    config,
    addresses,
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
