import path from 'path';
import jetpack from 'fs-jetpack';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';
import typescript from '@rollup/plugin-typescript';

const buildOutput = 'dist';
const sourcePath = path.resolve('src');

function resolvePath(pathParts) {
  return jetpack.path(...pathParts);
}

export const createValidName = (name, pluginPath = '') => {
  const pluginParts = pluginPath ? pluginPath.split('/').filter(Boolean) : [];
  const parts = [...pluginParts, name];
  
  return 'Cef' + parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};

export const getReactEntries = () => {
  const entries = [];
  
  // Get main CEF React components
  const mainCefPath = resolvePath([sourcePath, 'main', 'cef']);
  if (jetpack.exists(mainCefPath)) {
    const mainReactFiles = jetpack.find(mainCefPath, {
      matching: ['*.tsx'],
      recursive: true,
      files: true
    }) || [];
    
    mainReactFiles.forEach(file => {
      const name = path.basename(file, '.tsx');
      entries.push({
        input: file,
        name: `main_${name}`,
        type: 'main',
        varName: createValidName(name, 'main')
      });
    });
  }

  // Get plugin CEF React components
  const pluginReactFiles = jetpack.find(resolvePath([sourcePath, 'plugin']), {
    matching: ['**/cef/**/*.tsx'],
    recursive: true,
    files: true
  }) || [];

  pluginReactFiles.forEach(file => {
    const pluginPath = path.relative(
      resolvePath([sourcePath, 'plugin']),
      path.dirname(path.dirname(file))
    );
    const componentName = path.basename(file, '.tsx');
    
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
  input: 'react/main.css',
  output: {
    file: path.join(buildOutput, 'client_packages', 'cef', 'main.css'),
  },
  plugins: [
    postcss({
      plugins: [
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
    // Create a mapping of component names to their constructors
    const componentVarNames = entries.reduce((acc, entry) => {
      acc[entry.name] = entry.varName;
      return acc;
    }, {});

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
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
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
        transition: opacity 0.2s ease-in-out;
        user-select: none;
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
      componentConstructors: ${JSON.stringify(componentVarNames)},
      visibilityState: {},
      roots: {}, // Store React roots
      
      init() {
        this.components.forEach(name => {
          this.visibilityState[name] = false;
        });
        
        // Initialize React roots
        document.addEventListener('DOMContentLoaded', () => {
          this.components.forEach(name => {
            const element = document.getElementById(name);
            const constructor = window[this.componentConstructors[name]];
            if (element && constructor) {
              this.roots[name] = ReactDOM.createRoot(element);
              this.roots[name].render(React.createElement(constructor));
            }
          });
        });
      },
      
      getHighestZIndex() {
        return Math.max(...this.components.map(name => {
          const el = document.getElementById(name);
          return el ? parseInt(el.style.zIndex, 10) : 0;
        }));
      },
      
      bringToFront(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          const highest = this.getHighestZIndex();
          el.style.zIndex = highest + 1;
        }
      },
      
      show(componentName) {
        const el = document.getElementById(componentName);
        if (el) {
          el.classList.remove('cef-hidden');
          this.visibilityState[componentName] = true;
          this.bringToFront(componentName);
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
    </script>
</body>
</html>`
    });
  }
});

export const generateReactConfigs = (entries) => {
  const outputDir = path.join(buildOutput, 'client_packages', 'cef');
  
  const componentConfigs = entries.map(entry => ({
    input: entry.input,
    output: {
      dir: outputDir,
      format: 'iife',
      name: entry.varName,
      globals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
      },
      entryFileNames: `${entry.name}.js`,
    },
    external: ['react', 'react-dom'],
    plugins: [
      nodeResolve({
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }),
      typescript({
        tsconfig: './tsconfig.json',
        noEmitOnError: false,
        outputToFilesystem: false,
        compilerOptions: {
          noEmit: false,
          declaration: false,
          declarationMap: false,
          sourceMap: false,
          emitDeclarationOnly: false,
          outDir: path.join(buildOutput, 'client_packages', 'cef'),
        },
        include: ['./src/**/*.{ts,tsx}'],
        exclude: ['node_modules', 'dist'],
      }),
      babel({
        babelHelpers: 'bundled',
        presets: [
          '@babel/preset-env',
          '@babel/preset-react',
          '@babel/preset-typescript'
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }),
      postcss({
        plugins: [
          tailwindcss(),
          autoprefixer()
        ],
        extract: `${entry.name}.css`,
        minimize: true
      }),
      commonjs()
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
export const reactEntries = getReactEntries();
export const reactConfigs = reactEntries.length > 0 ? generateReactConfigs(reactEntries) : [];