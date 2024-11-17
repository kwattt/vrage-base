import { mainCssConfig as vueMainCssConfig, vueConfigs, vueEntries } from './scripts/rollup/vue';
import { mainCssConfig as reactMainCssConfig, reactConfigs, reactEntries } from './scripts/rollup/react';
import { generateConfig } from './scripts/rollup/client_server';

// Get UI framework from environment variable, default to Vue if not specified
const UI_FRAMEWORK = process.env.UI_FRAMEWORK?.toLowerCase() || 'vue';

// Warning suppression handler
const suppressWarnings = {
  onwarn(warning, warn) {
    if (warning.code === 'PLUGIN_WARNING' && warning.plugin === 'typescript' && warning.message.includes('TS6305')) {
      return;
    }
    warn(warning);
  }
};

// Select appropriate configurations based on UI framework
const getUIConfigs = () => {
  switch (UI_FRAMEWORK) {
    case 'react':
      return {
        mainCss: { ...reactMainCssConfig, ...suppressWarnings },
        configs: reactConfigs.map(config => ({ ...config, ...suppressWarnings })),
        entries: reactEntries
      };
    case 'vue':
    default:
      return {
        mainCss: { ...vueMainCssConfig, ...suppressWarnings },
        configs: vueConfigs.map(config => ({ ...config, ...suppressWarnings })),
        entries: vueEntries
      };
  }
};

const { mainCss, configs, entries } = getUIConfigs();

export default [
  generateConfig({ isServer: true }),
  generateConfig({ isServer: false }),
  {...mainCss,   onwarn(warning, warn) {
    // Ignore CSS file overwrite warnings
    if (warning.code === 'FILE_NAME_CONFLICT' && warning.message.includes('main.css')) {
      return;
    }
    warn(warning);
  }},
  ...(entries.length > 0 ? configs : [])
];