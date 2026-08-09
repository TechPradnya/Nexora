import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';

export interface InjectedWallet { uuid: string; name: string; icon?: string; apiVersion: string; api: InitialAPI; }
export function listInjectedWallets(): InjectedWallet[] {
  if (typeof window === 'undefined' || !window.midnight) return [];
  return Object.entries(window.midnight).flatMap(([uuid, candidate]) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const w = candidate as Partial<InitialAPI> & { name?: string; icon?: string; apiVersion?: string };
    if (!w.name || !w.apiVersion || typeof w.connect !== 'function' || !semver.satisfies(w.apiVersion, '4.x')) return [];
    return [{ uuid, name: w.name, icon: w.icon, apiVersion: w.apiVersion, api: w as InitialAPI }];
  });
}
export async function connectMidnight(network: string): Promise<{wallet: InjectedWallet; api: ConnectedAPI}> {
  const wallets = listInjectedWallets();
  if (!wallets.length) throw new Error('No compatible Midnight wallet found. Install/update the Midnight wallet extension and refresh.');
  const wallet = wallets[0];
  try { const connected = await wallet.api.connect(network); await connected.getConnectionStatus(); return { wallet, api: connected }; }
  catch (e: any) { const reason = e?.reason ?? e?.message ?? 'Wallet connection was rejected.'; throw new Error(`Wallet connection failed: ${reason}`); }
}
