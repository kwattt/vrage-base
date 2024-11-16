import vuePlugin from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import path from 'path';
import jetpack from 'fs-jetpack';
import nodeResolvePlugin from '@rollup/plugin-node-resolve';
import typescriptPlugin from 'rollup-plugin-typescript2';
import commonjsPlugin from '@rollup/plugin-commonjs';

const buildOutput = 'dist';
function resolvePath(pathParts) {
  return jetpack.path(...pathParts);
}
const sourcePath = path.resolve('src');

export const createValidName = (name, pluginPath = '') => {
  // Get plugin directory structure for uniqueness
  const pluginParts = pluginPath ? pluginPath.split('/').filter(Boolean) : [];
  const parts = [...pluginParts, name];
  
  // Convert to camelCase and ensure it's a valid JS identifier
  return 'Cef' + parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};

export const getVueEntries = () => {
  const entries = [];
  
  // Get main CEF Vue components
  const mainCefPath = resolvePath([sourcePath, 'main', 'cef']);
  if (jetpack.exists(mainCefPath)) {
    const mainVueFiles = jetpack.find(mainCefPath, {
      matching: ['*.vue'],
      recursive: true,
      files: true
    }) || [];
    
    mainVueFiles.forEach(file => {
      const name = path.basename(file, '.vue');
      entries.push({
        input: file,
        name: `main_${name}`,
        type: 'main',
        varName: createValidName(name, 'main')
      });
    });
  }

  // Get plugin CEF Vue components
  const pluginVueFiles = jetpack.find(resolvePath([sourcePath, 'plugin']), {
    matching: ['**/cef/**/*.vue'],
    recursive: true,
    files: true
  }) || [];

  pluginVueFiles.forEach(file => {
    // Get the full plugin path relative to the plugins directory
    const pluginPath = path.relative(
      resolvePath([sourcePath, 'plugin']),
      path.dirname(path.dirname(file))
    );
    const componentName = path.basename(file, '.vue');
    
    entries.push({
      input: file,
      name: `plugin_${pluginPath.replace(/\//g, '_')}_${componentName}`,
      type: 'plugin',
      plugin: pluginPath,
      varName: createValidName(componentName, pluginPath)
    });
  });

  return entries;
};

export const mainCssConfig = {
  input: 'vue/main.css',
  output: {
    file: path.join(buildOutput, 'client_packages', 'cef', 'main.css'),
  },
  plugins: [
    postcss({
      plugins: [
        postcssImport(),
        tailwindcss(),
        autoprefixer(),
      ],
      extract: true,
      minimize: true,
    }),
  ],
};

export const createHtmlPlugin = (entries) => ({
  name: 'generate-html',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'index.html',
      source: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VRAGE-UI</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="./main.css">
    ${entries.map(entry => 
      `<link rel="stylesheet" href="./${entry.name}.css">`
    ).join('\n    ')}
    <style>
      .cef-component {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        transition: opacity 0.2s ease-in-out;
      }
      .cef-component > * {
        pointer-events: auto;
      }
      .cef-hidden {
        opacity: 0;
        pointer-events: none !important;
      }
    </style>
</head>
<body>
    ${entries.map(entry => 
      `<div id="${entry.name}" class="cef-component cef-hidden" style="z-index: 1;"></div>`
    ).join('\n    ')}
    
    ${entries.map(entry => 
      `<script src="./${entry.name}.js"></script>`
    ).join('\n    ')}
    
    <script>
    // Enhanced CEF management system
    window.CEF = {
      components: ${JSON.stringify(entries.map(e => e.name))},
      visibilityState: {},
      
      // Initialize visibility state
      init() {
        this.components.forEach(name => {
          this.visibilityState[name] = false;
        });
      },
      
      // Get the highest z-index currently in use
      getHighestZIndex() {
        return Math.max(...this.components.map(name => {
          const el = document.getElementById(name);
          return el ? parseInt(el.style.zIndex, 10) : 0;
        }));
      },
      
      // Layer management
      bringToFront(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          const highest = this.getHighestZIndex();
          el.style.zIndex = highest + 1;
        }
      },
      
      sendToBack(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          const lowest = Math.min(...this.components.map(name => {
            const el = document.getElementById(name);
            return el ? parseInt(el.style.zIndex, 10) : 0;
          }));
          el.style.zIndex = lowest - 1;
        }
      },
      
      setZIndex(componentName, zIndex) {
        const el = document.getElementById(componentName);
        if (el) {
          el.style.zIndex = zIndex;
        }
      },
      
      moveAbove(componentName, referenceComponentName) {
        const el = document.getElementById(componentName);
        const ref = document.getElementById(referenceComponentName);
        if (el && ref) {
          el.style.zIndex = parseInt(ref.style.zIndex, 10) + 1;
        }
      },
      
      moveBelow(componentName, referenceComponentName) {
        const el = document.getElementById(componentName);
        const ref = document.getElementById(referenceComponentName);
        if (el && ref) {
          el.style.zIndex = parseInt(ref.style.zIndex, 10) - 1;
        }
      },

      // Visibility management
      show(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          el.classList.remove('cef-hidden');
          this.visibilityState[componentName] = true;
          // Optionally bring to front when showing
          this.bringToFront(componentName);
          // Dispatch event for Vue components
          window.postMessage(JSON.stringify({
            component: componentName,
            visible: true
          }), '*');
        }
      },
      
      hide(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          el.classList.add('cef-hidden');
          this.visibilityState[componentName] = false;
          // Dispatch event for Vue components
          window.postMessage(JSON.stringify({
            component: componentName,
            visible: false
          }), '*');
        }
      },

      toggle(componentName) {
        if (this.isVisible(componentName)) {
          this.hide(componentName);
        } else {
          this.show(componentName);
        }
      },

      isVisible(componentName) {
        return this.visibilityState[componentName] || false;
      },

      hideAll() {
        this.components.forEach(name => this.hide(name));
      },

      showOnly(componentName) {
        this.hideAll();
        this.show(componentName);
      },

      getVisibleComponents() {
        return this.components.filter(name => this.isVisible(name));
      }
    };

    // Initialize the system
    window.CEF.init();

    // Initialize components
    document.addEventListener('DOMContentLoaded', () => {
        ${entries.map((entry, index) => `
        const ${entry.name}App = Vue.createApp(${entry.varName});
        ${entry.name}App.mount('#${entry.name}');`
        ).join('\n        ')}
    });
    </script>
</body>
</html>`
    });
  }
});


export const generateVueConfigs = (entries) => {
  const outputDir = path.join(buildOutput, 'client_packages', 'cef');
  
  // Create individual configs for each component
  const componentConfigs = entries.map(entry => ({
    input: entry.input,
    output: {
      dir: outputDir,
      format: 'iife',
      name: entry.varName,
      globals: {
        'vue': 'Vue'
      },
      entryFileNames: `${entry.name}.js`,
    },
    external: ['vue'],
    plugins: [
      nodeResolvePlugin({
        browser: true,
        extensions: ['.js', '.ts', '.vue']
      }),
      vuePlugin({
        preprocessStyles: true,
        template: {
          isProduction: true,
          compilerOptions: {
            whitespace: 'condense'
          }
        }
      }),
      typescriptPlugin({
        check: false,
        tsconfig: path.resolve(__dirname, './src/main/cef/tsconfig.json'),
        tsconfigOverride: {
          compilerOptions: {
            declaration: false,
            declarationMap: false,
            sourceMap: false
          }
        }
      }),
      commonjsPlugin({
        extensions: ['.js', '.ts'],
        exclude: ['**/*.vue']
      })
    ]
  }));

  const htmlConfig = {
    input: 'virtual-empty.js',
    output: {
      dir: outputDir,
      format: 'esm'
    },
    plugins: [
      {
        name: 'virtual-empty',
        resolveId(id) {
          if (id === 'virtual-empty.js') return id;
          return null;
        },
        load(id) {
          if (id === 'virtual-empty.js') return 'export default {}';
          return null;
        }
      },
      createHtmlPlugin(entries)
    ]
  };

  return [...componentConfigs, htmlConfig];
};

// Export configurations
export const vueEntries = getVueEntries();
export const vueConfigs = vueEntries.length > 0 ? generateVueConfigs(vueEntries) : [];
