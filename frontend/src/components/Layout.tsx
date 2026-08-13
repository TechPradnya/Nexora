import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  Bot,
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileCheck2,
  WalletCards,
  BadgeCheck,
  Activity,
  Menu,
  X,
  Rocket,
} from 'lucide-react';

import { useState } from 'react';

import { useWallet } from '../contexts/WalletContext';

import {
  deployNexora,
} from '../lib/deployNexora';

import {
  createNexoraPrivateState,
} from '../lib/nexoraContract';

const nav = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/agents', 'Agents', Users],
  ['/policies', 'Policies', FileCheck2],
  ['/escrows', 'Escrow', WalletCards],
  ['/verification', 'Verification', ShieldCheck],
  ['/reputation', 'Reputation', BadgeCheck],
  ['/activity', 'Activity', Activity],
] as const;

export function Layout() {
  const [open, setOpen] = useState(false);
  const [deploying, setDeploying] =
    useState(false);
  const [deployMessage, setDeployMessage] =
    useState('');

  const {
    connected,
    address,
    network,
    connect,
    disconnect,
    error,
    api,
    providers,
  } = useWallet();

  const loc = useLocation();

  const handleDeploy = async () => {
    if (!api) {
      setDeployMessage(
        'Connect the Midnight wallet first.',
      );
      return;
    }

    if (!providers) {
      setDeployMessage(
        'Midnight providers are not ready yet.',
      );
      return;
    }

    if (import.meta.env.VITE_CONTRACT_ADDRESS) {
      setDeployMessage(
        'A contract address is already configured. Do not deploy another contract from this button.',
      );
      return;
    }

    setDeploying(true);
    setDeployMessage(
      'Preparing Nexora deployment…',
    );

    try {
      const initialPrivateState =
        createNexoraPrivateState();

      const deployed =
        await deployNexora(
          api,
          providers,
          initialPrivateState,
        );

      const txId =
        deployed.deployTxData?.public?.txId;

      setDeployMessage(
        txId
          ? `Nexora deployment submitted/finalized. Transaction: ${txId}`
          : 'Nexora deployment completed. Check the wallet/network for the deployed contract address.',
      );

      console.log(
        '[Nexora] Deployment completed.',
        {
          txId,
        },
      );
    } catch (error: unknown) {
      console.error(
        '[Nexora] Deployment failed:',
        error,
      );

      setDeployMessage(
        error instanceof Error
          ? error.message
          : 'Nexora deployment failed.',
      );
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="app-shell">
      <aside
        className={
          open
            ? 'sidebar open'
            : 'sidebar'
        }
      >
        <div className="brand">
          <div className="brand-mark">
            <Bot size={20} />
          </div>

          <div>
            <b>NEXORA</b>
            <span>
              Agent trust infrastructure
            </span>
          </div>
        </div>

        <nav>
          {nav.map(
            ([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                onClick={() =>
                  setOpen(false)
                }
                className={({
                  isActive,
                }) =>
                  isActive
                    ? 'active'
                    : ''
                }
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="privacy-chip">
            <span className="dot" />
            Midnight privacy layer
          </div>

          <small>
            Proof-first settlement
          </small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setOpen(!open)
            }
          >
            {open ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>

          <div>
            <span className="eyebrow">
              {loc.pathname ===
              '/dashboard'
                ? 'CONTROL PLANE'
                : 'NEXORA WORKSPACE'}
            </span>

            <h1>
              {nav.find(
                (n) =>
                  n[0] === loc.pathname,
              )?.[1] ??
                'Nexora'}
            </h1>
          </div>

          <div className="top-actions">
            {connected ? (
              <>
                {!import.meta.env
                  .VITE_CONTRACT_ADDRESS && (
                  <button
                    className="button primary"
                    onClick={handleDeploy}
                    disabled={deploying}
                    title="Deploy the Nexora Compact contract"
                  >
                    <Rocket
                      size={16}
                    />

                    {deploying
                      ? 'Deploying…'
                      : 'Deploy Nexora'}
                  </button>
                )}

                <button
                  className="wallet connected"
                  onClick={disconnect}
                >
                  <span className="dot" />

                  {address?.slice(
                    0,
                    10,
                  )}
                  …

                  <em>
                    {network}
                  </em>
                </button>
              </>
            ) : (
              <button
                className="button primary"
                onClick={connect}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="alert error">
            <strong>
              Wallet:
            </strong>{' '}
            {error}
          </div>
        )}

        {deployMessage && (
          <div className="alert">
            <strong>
              Deployment:
            </strong>{' '}
            {deployMessage}
          </div>
        )}

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
