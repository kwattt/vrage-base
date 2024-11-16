import { mainCssConfig, vueConfigs, vueEntries } from './scripts/rollup/vue';
import { generateConfig } from './scripts/rollup/client_server';

export default [
  generateConfig({ isServer: true }), 
  generateConfig({ isServer: false }),
  mainCssConfig,
  ...(vueEntries.length > 0 ? vueConfigs : [])
];
