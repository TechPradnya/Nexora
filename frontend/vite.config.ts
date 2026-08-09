import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'node:path';

const onchainRuntimePackage =
  '@midnight-ntwrk/onchain-runtime-v3';

export default defineConfig({
  cacheDir: './.vite',

  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],

  resolve: {
    extensions: [
      '.mjs',
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.json',
      '.wasm',
    ],

    mainFields: [
      'browser',
      'module',
      'main',
    ],

    alias: {
      '@midnight-ntwrk/onchain-runtime':
        onchainRuntimePackage,
    },

    dedupe: [
      '@midnight-ntwrk/compact-runtime',
    ],
  },

  build: {
    target: 'esnext',

    minify: false,

    commonjsOptions: {
      transformMixedEsModules: true,
      extensions: ['.js', '.cjs'],
      ignoreDynamicRequires: true,
    },

    rollupOptions: {
      output: {
        manualChunks: {
          wasm: [onchainRuntimePackage],
        },
      },
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',

      supported: {
        'top-level-await': true,
      },

      define: {
        global: 'globalThis',
      },
    },

    /*
     * IMPORTANT:
     * compact-runtime MUST be optimized.
     *
     * onchain-runtime-v3 is WASM and must NOT
     * be optimized by Vite.
     */
    include: [
      '@midnight-ntwrk/compact-runtime',
    ],

    exclude: [
      onchainRuntimePackage,

      `${onchainRuntimePackage}/midnight_onchain_runtime_wasm_bg.wasm`,

      `${onchainRuntimePackage}/midnight_onchain_runtime_wasm.js`,
    ],
  },
});