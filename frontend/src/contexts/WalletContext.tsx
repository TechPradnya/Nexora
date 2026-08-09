import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { connectMidnight, listInjectedWallets } from '../lib/wallet';
import { createMidnightContext, type MidnightContext } from '../lib/midnight';
import { randomHex } from '../lib/commitment';
import type { TxState } from '../types/domain';

type WalletState = { available: boolean; connected: boolean; address?: string; network?: string; api?: ConnectedAPI; ctx?: MidnightContext; txState: TxState; error?: string; connect: () => Promise<void>; disconnect: () => void; };
const Ctx = createContext<WalletState | null>(null);
const SECRET_KEY = 'nexora:local-secret:v1';
export function WalletProvider({children}:{children:React.ReactNode}) {
  const [available,setAvailable]=useState(false); const [api,setApi]=useState<ConnectedAPI>(); const [ctx,setCtx]=useState<MidnightContext>(); const [txState,setTxState]=useState<TxState>('Idle'); const [error,setError]=useState<string>();
  useEffect(()=>{ const check=()=>setAvailable(listInjectedWallets().length>0); check(); const t=setInterval(check,500); return()=>clearInterval(t); },[]);
  const connect=async()=>{ setTxState('Connecting'); setError(undefined); try { const network=import.meta.env.VITE_NETWORK_ID??'preview'; const {api:connected}=await connectMidnight(network); setApi(connected); const existing=localStorage.getItem(SECRET_KEY); const secretHex=existing??randomHex(32); if(!existing)localStorage.setItem(SECRET_KEY,secretHex); const bytes=Uint8Array.from(secretHex.match(/.{2}/g)!.map(h=>parseInt(h,16))); try { const c=await createMidnightContext(connected,bytes); setCtx(c); setTxState('Success'); } catch(e:any) { setTxState('Failed'); setError(e.message); } } catch(e:any){setTxState('Failed');setError(e.message);} };
  const disconnect=()=>{setApi(undefined);setCtx(undefined);setTxState('Idle');setError(undefined);};
  const value=useMemo(()=>({available,connected:!!api,address:ctx?.address,network:ctx?.networkId,api,ctx,txState,error,connect,disconnect}),[available,api,ctx,txState,error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useWallet=()=>{const v=useContext(Ctx);if(!v)throw new Error('useWallet must be used inside WalletProvider');return v;};
