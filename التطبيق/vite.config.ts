import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domain': r('./src/domain'),
      '@data': r('./src/data'),
      '@runtime': r('./src/runtime'),
      '@templates': r('./src/templates'),
      '@content': r('./src/content'),
      '@assets': r('./src/assets'),
    },
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          storage: ['dexie'],
          schema: ['zod'],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
