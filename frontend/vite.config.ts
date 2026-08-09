import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  build: {
    target: 'esnext',
    commonjsOptions: { transformMixedEsModules: true, extensions: ['.js', '.cjs'] },
    rollupOptions: { output: { manualChunks: { wasm: ['@midnight-ntwrk/onchain-runtime-v3'] } } }
  },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext', supported: { 'top-level-await': true }, define: { global: 'globalThis' } },
    exclude: [
      '@midnight-ntwrk/compact-runtime', '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/midnight-js-contracts', '@midnight-ntwrk/midnight-js-http-client-proof-provider',
      '@midnight-ntwrk/midnight-js-indexer-public-data-provider', '@midnight-ntwrk/midnight-js-level-private-state-provider',
      '@midnight-ntwrk/midnight-js-network-id', '@midnight-ntwrk/midnight-js-utils'
    ]
  }
});
