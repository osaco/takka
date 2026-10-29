import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
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
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/data/**', 'src/runtime/world/projection.ts'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
