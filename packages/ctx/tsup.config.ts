import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { 'cli/main': 'src/cli/main.ts' },
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    outDir: 'dist',
    clean: false,
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    target: 'node22',
    platform: 'node',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
  },
]);
