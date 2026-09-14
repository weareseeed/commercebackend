import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sandbox: resolve(__dirname, 'docs/sandbox/index.html'),
        operator: resolve(__dirname, 'operator/index.html'),
        blogProtocolsSquare: resolve(__dirname, 'blog/agent-protocols-and-catalog-connectors/index.html'),
      },
    },
  },
});
