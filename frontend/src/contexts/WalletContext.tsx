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

import {
  createMidnightContext,
  createMidnightProviders,
  type MidnightContext,
  type MidnightProviders,
} from '../lib/midnight';

import type { TxState } from '../types/domain';

type WalletState = {
  available: boolean;
  connected: boolean;

  address?: string;
  network?: string;

  api?: ConnectedAPI;
  ctx?: MidnightContext;
  providers?: MidnightProviders;

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
  const [providers, setProviders] =
    useState<MidnightProviders>();
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [txState, setTxState] =
    useState<TxState>('Idle');
  const [error, setError] = useState<string>();

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

  const connect = async (): Promise<void> => {
    setTxState('Connecting');
    setError(undefined);

    try {
      const requestedNetwork =
        import.meta.env.VITE_NETWORK_ID || 'preview';

      const {
        api: connected,
      } = await connectMidnight(
        requestedNetwork,
      );

      setApi(connected);

      const config =
        await connected.getConfiguration();

      setNetwork(config.networkId);

      const addresses =
        await connected.getShieldedAddresses();

      setAddress(
        addresses.shieldedAddress,
      );

      /*
       * Create the Midnight providers now that the
       * wallet connection is available.
       *
       * This does NOT deploy a contract.
       */
      const base =
        await createMidnightProviders(
          connected,
        );

      setProviders(base.providers);

      /*
       * If a real deployed contract address already
       * exists in the environment, initialize the
       * application contract context as well.
       *
       * Otherwise we remain in provider-only mode,
       * ready for the deployment action.
       */
      if (
        import.meta.env.VITE_CONTRACT_ADDRESS
      ) {
        const contractContext =
          await createMidnightContext(
            connected,
          );

        setCtx(contractContext);
      } else {
        setCtx(undefined);
      }

      setTxState('Success');

      console.log(
        '[Nexora] Midnight wallet and providers ready.',
        {
          network: config.networkId,
          address:
            addresses.shieldedAddress,
          contractConfigured:
            Boolean(
              import.meta.env
                .VITE_CONTRACT_ADDRESS,
            ),
        },
      );
    } catch (error: unknown) {
      console.error(
        '[Nexora] Wallet/provider initialization failed:',
        error,
      );

      setTxState('Failed');

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to initialize Midnight wallet.';

      setError(message);

      setApi(undefined);
      setProviders(undefined);
      setAddress(undefined);
      setNetwork(undefined);
      setCtx(undefined);
    }
  };

  const disconnect = () => {
    setApi(undefined);
    setProviders(undefined);
    setCtx(undefined);
    setAddress(undefined);
    setNetwork(undefined);
    setTxState('Idle');
    setError(undefined);
  };

  const value = useMemo(
    () => ({
      available,

      connected: Boolean(api),

      address,
      network,

      api,
      ctx,
      providers,

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
      providers,
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
