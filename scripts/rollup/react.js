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

const copyStaticFiles = () => ({
  name: 'copy-static-files',
  async buildStart() {
    // Helper function to copy files and emit them
    const copyFiles = async (sourcePath, targetPath, pattern) => {
      const files = jetpack.find(sourcePath, { matching: pattern, recursive: true, files: true }) || [];
      
      for (const file of files) {
        const relativePath = path.relative(sourcePath, file);
        const content = await jetpack.readAsync(file, 'buffer');
        
        this.emitFile({
          type: 'asset',
          fileName: path.join(targetPath, relativePath),
          source: content
        });
      }
    };

    // Copy main CEF static files
    const mainCefPath = resolvePath([sourcePath, 'main', 'cef', 'static']);
    if (jetpack.exists(mainCefPath)) {
      await copyFiles(
        mainCefPath,
        'static',
        ['**/*.{jpg,jpeg,png,gif,svg,webp,ico,mp3,wav,ogg,pdf,ttf,woff,woff2}']
      );
    }

    // Copy plugin CEF static files
    const pluginPaths = jetpack.find(resolvePath([sourcePath, 'plugin']), {
      matching: ['**/cef/static'],
      recursive: true,
      directories: true
    }) || [];

    for (const pluginStaticPath of pluginPaths) {
      const pluginPath = path.relative(
        resolvePath([sourcePath, 'plugin']),
        path.dirname(path.dirname(pluginStaticPath))
      );
      
      await copyFiles(
        pluginStaticPath,
        path.join('static', 'plugins', pluginPath),
        ['**/*.{jpg,jpeg,png,gif,svg,webp,ico,mp3,wav,ogg,pdf,ttf,woff,woff2}']
      );
    }
  }
});


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
      
      getStaticPath(pluginName, fileName) {
        if (pluginName) {
          return \`./static/plugins/\${pluginName}/\${fileName}\`;
        }
        return \`./static/\${fileName}\`;
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
        browser: true,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
        moduleDirectories: ['node_modules', '.yalc'],
        preferBuiltins: false
      }),
      typescript({
        tsconfig: './tsconfig.json',
        noEmitOnError: false,
        compilerOptions: {
          noEmit: false,
          declaration: false,
          declarationMap: false,
          sourceMap: false,
          jsx: 'react',
          module: 'esnext',
          target: 'es2016',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          // Remove outDir from here - let Rollup handle the output
        },
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['node_modules', 'dist']
      }),
      commonjs({
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        include: [
          /node_modules/,
          /@kwattt\/vrage/,
          /\.yalc/
        ],
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        esmExternals: true
      }),
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', {
            modules: false
          }],
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
      copyStaticFiles()
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