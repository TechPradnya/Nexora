import { Buffer } from 'buffer'; (globalThis as any).Buffer = Buffer;
import React from 'react'; import ReactDOM from 'react-dom/client'; import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; import App from './App'; import { WalletProvider } from './contexts/WalletContext'; import './styles.css';
const client=new QueryClient(); ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={client}><WalletProvider><App/></WalletProvider></QueryClientProvider></React.StrictMode>);
