import type {
  InitialAPI,
  ConnectedAPI,
} from '@midnight-ntwrk/dapp-connector-api';

export interface InjectedWallet {
  uuid: string;
  name: string;
  icon?: string;
  apiVersion?: string;
  api: InitialAPI;
}

/**
 * Discover Midnight-compatible wallet extensions.
 *
 * Midnight wallets inject themselves under:
 *
 * window.midnight
 *
 * Each wallet can have a different key.
 * For example, 1AM currently appears as:
 *
 * window.midnight["1am"]
 *
 * We therefore enumerate all entries instead of hard-coding
 * a particular wallet name/key.
 */
export function listInjectedWallets(): InjectedWallet[] {
  if (
    typeof window === 'undefined' ||
    !window.midnight ||
    typeof window.midnight !== 'object'
  ) {
    return [];
  }

  return Object.entries(window.midnight).flatMap(
    ([uuid, candidate]) => {
      if (
        !candidate ||
        typeof candidate !== 'object'
      ) {
        return [];
      }

      const wallet =
        candidate as Partial<InitialAPI>;

      /**
       * The most important compatibility check is the
       * DApp Connector connect() function.
       *
       * Do not depend on a specific wallet key such as
       * "1am" because wallet identifiers are implementation
       * details.
       */
      if (
        typeof wallet.connect !== 'function'
      ) {
        return [];
      }

      return [
        {
          uuid,
          name:
            typeof wallet.name === 'string'
              ? wallet.name
              : 'Midnight Wallet',
          icon:
            typeof wallet.icon === 'string'
              ? wallet.icon
              : undefined,
          apiVersion:
            typeof wallet.apiVersion === 'string'
              ? wallet.apiVersion
              : undefined,
          api: wallet as InitialAPI,
        },
      ];
    },
  );
}

/**
 * Connect to the first available Midnight wallet.
 *
 * network should normally be something like:
 *
 * "preview"
 * "preprod"
 * "undeployed"
 */
export async function connectMidnight(
  network: string,
): Promise<{
  wallet: InjectedWallet;
  api: ConnectedAPI;
}> {
  const wallets = listInjectedWallets();

  if (wallets.length === 0) {
    throw new Error(
      'No compatible Midnight wallet found. ' +
        'Please install or enable the 1AM wallet extension, ' +
        'then refresh this page.',
    );
  }

  /**
   * For now we use the first detected Midnight wallet.
   *
   * Your browser currently shows:
   *
   * window.midnight["1am"]
   *
   * so this should select 1AM.
   */
  const wallet = wallets[0];

  try {
    console.log(
      '[Nexora] Connecting to Midnight wallet:',
      {
        uuid: wallet.uuid,
        name: wallet.name,
        apiVersion: wallet.apiVersion,
        network,
      },
    );

    const connected =
      await wallet.api.connect(network);

    /**
     * Verify that the connection is actually alive.
     */
    await connected.getConnectionStatus();

    console.log(
      '[Nexora] Midnight wallet connected successfully.',
    );

    return {
      wallet,
      api: connected,
    };
  } catch (error: unknown) {
    console.error(
      '[Nexora] Midnight wallet connection failed:',
      error,
    );

    const reason =
      typeof error === 'object' &&
      error !== null &&
      'reason' in error
        ? String(
            (error as { reason?: unknown }).reason,
          )
        : error instanceof Error
          ? error.message
          : 'Wallet connection was rejected.';

    throw new Error(
      `Wallet connection failed: ${reason}`,
    );
  }
}