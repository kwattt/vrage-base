import { defineConfig, ResolveFn } from 'vite';
import react from '@vitejs/plugin-react';
import serveStatic from "vite-plugin-serve-static";
import path from 'path';

import { existsSync } from 'fs';
import { resolve } from 'path';

// Check if the .yalc directory exists for the package
const yalcPath = resolve(__dirname, '.yalc/@kwattt/vrage/dist');
const useYalc = existsSync(yalcPath);

const serveStaticPlugin = serveStatic([
  // static files are located in src/plugin/**/cef/static
  {
    pattern: /\/plugin\/(.*)\/cef\/static\/(.*)(\..*)$/,
    resolve: (match: RegExpExecArray) => { 
      return path.resolve(__dirname, `src/plugin/${match[1]}/cef/static/${match[2]}${match[3]}`);
    }
  },
  {
    pattern: /\/main\/cef\/static\/(.*)(\..*)$/,
    resolve: (match: RegExpExecArray) => { 
      return path.resolve(__dirname, `src/main/cef/static/${match[1]}${match[2]}`);
    }
  }
]);

// serve all of src */plugin/**/cef/static as static files
export default defineConfig({
  plugins: [react(), serveStaticPlugin],
  root: 'react', // Set 'react/' as the root directory
  server: {
    open: true, // Opens the app in the browser automatically
  },
  resolve: {
    alias: useYalc ? {
      '@kwattt/vrage': '/home/kv/vrage-base/.yalc/@kwattt/vrage/dist',
    } : {}
  },
  build: {
    outDir: '../dist', // Output directory, adjusted to maintain project structure
  },
});
