import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

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
    coinPublicKey:
      addresses.shieldedCoinPublicKey,

    encryptionPublicKey:
      addresses.shieldedEncryptionPublicKey,

    balanceTx: async (
      tx: any,
      newCoins: any,
    ) => {
      const { tx: balanced } =
        await connected.balanceUnsealedTransaction(
          tx,
          newCoins,
        );

      return balanced;
    },
  };

  /*
   * Midnight transaction provider
   */
  const midnightProvider = {
    submitTx: (tx: any) =>
      connected.submitTransaction(tx),
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
   * The generated Compact contract artifact is created
   * during the Midnight contract compilation/deployment
   * process.
   *
   * It is intentionally loaded at runtime so Vite does not
   * try to resolve the missing generated artifact while
   * displaying the frontend UI.
   */
  const contractArtifactPath =
    '/contract/contract/index.cjs';

  let generated: any = null;

  try {
    const runtimeImport = new Function(
      'path',
      'return import(path)',
    ) as (
      path: string,
    ) => Promise<any>;

    generated = await runtimeImport(
      contractArtifactPath,
    );
  } catch {
    generated = null;
  }

  if (!generated) {
    throw new Error(
      'Compiled Nexora contract artifacts are missing. ' +
        'Compile the Nexora Compact contract and copy the ' +
        'generated contract artifacts into frontend/public/contract.',
    );
  }

  /*
   * Find the deployed Nexora contract.
   */
  const found = await findDeployedContract(
    providers,
    {
      compiledContract: generated,
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