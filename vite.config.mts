// vite.config.mts
import { defineConfig, ResolveFn } from 'vite';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import serveStatic from "vite-plugin-serve-static";
import path from 'path';
import { existsSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const UI_FRAMEWORK = process.env.UI_FRAMEWORK || 'react';

// Check if the .yalc directory exists for the package
const yalcPath = resolve(__dirname, '.yalc/@kwattt/vrage/dist');
const useYalc = existsSync(yalcPath);

const serveStaticPlugin = serveStatic([
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

// Framework-specific configurations
const frameworkConfigs = {
  react: {
    plugins: [react()],
    root: 'react',
    entry: '/preview.tsx'
  },
  vue: {
    plugins: [vue()],
    root: 'vue',
    entry: '/preview.ts'
  }
};

const currentConfig = frameworkConfigs[UI_FRAMEWORK];

export default defineConfig({
  plugins: [...currentConfig.plugins, serveStaticPlugin],
  root: currentConfig.root,
  server: {
    open: true,
  },
  resolve: {
    alias: {
      ...(useYalc ? {
        '@kwattt/vrage': '/home/kv/vrage-base/.yalc/@kwattt/vrage/dist',
      } : {}),
      '@': path.resolve(__dirname, 'src')
    },
    extensions: currentConfig.extensions
  },
  build: {
    outDir: '../dist',
  },
  optimizeDeps: {
    include: UI_FRAMEWORK === 'vue' ? ['vue'] : ['react', 'react-dom']
  },
});