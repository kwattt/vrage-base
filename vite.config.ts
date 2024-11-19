import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'dist/client_packages/cef'),
  server: {
    port: 3000,
    open: true
  }
});