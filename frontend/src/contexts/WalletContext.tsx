import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import {
  connectMidnight,
  listInjectedWallets,
} from '../lib/wallet';

import type { MidnightContext } from '../lib/midnight';

import type { TxState } from '../types/domain';

type WalletState = {
  available: boolean;
  connected: boolean;

  address?: string;
  network?: string;

  api?: ConnectedAPI;
  ctx?: MidnightContext;

  txState: TxState;
  error?: string;

  connect: () => Promise<void>;
  disconnect: () => void;
};

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [available, setAvailable] = useState(false);

  const [api, setApi] = useState<ConnectedAPI>();

  const [ctx, setCtx] = useState<MidnightContext>();

  const [address, setAddress] = useState<string>();

  const [network, setNetwork] = useState<string>();

  const [txState, setTxState] =
    useState<TxState>('Idle');

  const [error, setError] =
    useState<string>();

  /*
   * Detect the 1AM / Midnight wallet extension.
   */
  useEffect(() => {
    const checkWallet = () => {
      try {
        const wallets = listInjectedWallets();

        setAvailable(wallets.length > 0);
      } catch {
        setAvailable(false);
      }
    };

    checkWallet();

    const interval = window.setInterval(
      checkWallet,
      1000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Connect to the Midnight wallet.
   *
   * IMPORTANT:
   * At this stage we only connect the wallet.
   *
   * We DO NOT initialize the complete Midnight
   * contract/provider stack yet because Nexora does
   * not have a deployed contract address/artifacts
   * on this laptop.
   */
  const connect = async (): Promise<void> => {
    setTxState('Connecting');
    setError(undefined);

    try {
      const requestedNetwork =
        import.meta.env.VITE_NETWORK_ID || 'preview';

      /*
       * Connect to 1AM / Midnight wallet.
       */
      const {
        api: connected,
      } = await connectMidnight(
        requestedNetwork,
      );

      /*
       * Save connected wallet API.
       */
      setApi(connected);

      /*
       * Get wallet configuration.
       */
      const config =
        await connected.getConfiguration();

      setNetwork(config.networkId);

      /*
       * Get the shielded wallet address.
       */
      const addresses =
        await connected.getShieldedAddresses();

      setAddress(
        addresses.shieldedAddress,
      );

      /*
       * IMPORTANT:
       *
       * We intentionally do NOT call:
       *
       * createMidnightContext(...)
       *
       * here.
       *
       * That function initializes:
       * - Midnight JS providers
       * - ZK configuration
       * - proof provider
       * - indexer
       * - private state
       * - deployed contract
       *
       * Nexora does not have the deployed contract
       * configured yet.
       *
       * We will enable it after:
       *
       * 1. Compact compilation
       * 2. Contract deployment
       * 3. VITE_CONTRACT_ADDRESS
       * 4. Browser contract artifacts
       */

      setCtx(undefined);

      setTxState('Success');

      console.log(
        '[Nexora] Midnight wallet connected.',
        {
          network: config.networkId,
          address:
            addresses.shieldedAddress,
        },
      );
    } catch (error: unknown) {
      console.error(
        '[Nexora] Wallet connection failed:',
        error,
      );

      setTxState('Failed');

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to connect to Midnight wallet.';

      setError(message);

      setApi(undefined);
      setAddress(undefined);
      setNetwork(undefined);
      setCtx(undefined);
    }
  };

  /*
   * Disconnect the local Nexora wallet state.
   */
  const disconnect = () => {
    setApi(undefined);
    setCtx(undefined);
    setAddress(undefined);
    setNetwork(undefined);
    setTxState('Idle');
    setError(undefined);
  };

  const value = useMemo<WalletState>(
    () => ({
      available,

      connected: Boolean(api),

      address,
      network,

      api,
      ctx,

      txState,
      error,

      connect,
      disconnect,
    }),
    [
      available,
      api,
      address,
      network,
      ctx,
      txState,
      error,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = (): WalletState => {
  const value = useContext(Ctx);

  if (!value) {
    throw new Error(
      'useWallet must be used inside WalletProvider',
    );
  }

  return value;
};