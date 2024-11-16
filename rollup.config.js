import jetpack from 'fs-jetpack';
import path from 'path';
import { config } from 'dotenv';
import nodeResolvePlugin from '@rollup/plugin-node-resolve';
import { swc } from 'rollup-plugin-swc3';
import jsonPlugin from '@rollup/plugin-json';
import { blueBright, greenBright, redBright } from 'colorette';
import builtinModules from 'builtin-modules';
import commonjsPlugin from '@rollup/plugin-commonjs';
import tsPaths from 'rollup-plugin-tsconfig-paths';
import typescriptPlugin from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import vuePlugin from 'rollup-plugin-vue';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';
import html from '@rollup/plugin-html';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';

config({
  path: path.resolve('.env')
});

const buildOutput = 'dist';
const isProduction = process.env.PRODUCTION_MODE === 'true';
const useSWC = process.env.COMPILER_USE_SWC === 'true';
const sourcePath = path.resolve('src');
const pkgJson = jetpack.read('package.json', 'json');
const localInstalledPackages = [...Object.keys(pkgJson.dependencies)];

// Helper functions remain the same...
function resolvePath(pathParts) {
  return jetpack.path(...pathParts);
}

function successMessage(message, type = 'Success') {
  console.log(`[${greenBright(type)}] ${message}`);
}

function errorMessage(message, type = 'Error') {
  console.log(`[${redBright(type)}] ${message}`);
}

function copy(source, destination, options = { overwrite: true }) {
  return jetpack.copy(source, destination, options);
}

function cleanUp() {
  if (!jetpack.exists(buildOutput)) {
      return;
  }

  const preserved = [
      'node_modules/**/*',
      'ragemp-server*',
      '.env',
      'BugTrap-x64.dll',
      'bin/**/*',
      'dotnet/**/*',
      'maps/**/*',
      'plugins/**/*',
      'client_packages/game_resources/dlcpacks/**/*',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock'
  ];

  const removeablePaths = jetpack.find('dist', {
      matching: preserved.map((path) => `!${path}`),
      directories: false
  });

  removeablePaths.forEach((path) => {
      jetpack.remove(path);
      errorMessage(path, 'Removed');
  });
}

function copyFiles() {
  const prepareForCopy = [];

  prepareForCopy.push(
      {
          from: jetpack.path('package.json'),
          to: jetpack.path(buildOutput, 'package.json')
      },
      {
          from: jetpack.path('.env'),
          to: jetpack.path(buildOutput, '.env')
      },
      {
          from: jetpack.path('conf.json'),
          to: jetpack.path(buildOutput, 'conf.json')
      }
  );

  prepareForCopy.forEach((item) => {
      copy(item.from, item.to);
      successMessage(blueBright(`${item.from} -> ${item.to}`), 'Copied');
  });
}

cleanUp();
copyFiles();

// Virtual entry generator for combining multiple entry points
const createVirtualEntry = (entries) => {
  const imports = entries.map((file, index) => `import * as mod${index} from '${file}';`).join('\n');
  const exports = entries.map((_, index) => `mod${index}`).join(',\n  ');
  return `
${imports}

export {
${exports}
};`;
};

// Safe plugin entry finder
const getPluginEntries = (type) => {
  const pluginPath = resolvePath([sourcePath, 'plugin']);
  
  // Check if plugin directory exists
  if (!jetpack.exists(pluginPath)) {
      successMessage(`No plugins directory found at ${pluginPath}`, 'Info');
      return [];
  }

  try {
      const entries = jetpack.find(pluginPath, {
          matching: [`*/${type}/index.ts`],
          recursive: true,
          files: true
      }) || [];

      if (entries.length > 0) {
          successMessage(`Found ${entries.length} plugin(s) for ${type}`, 'Plugins');
          entries.forEach(entry => {
              successMessage(`Found plugin: ${entry}`, 'Plugin');
          });
      }

      return entries;
  } catch (error) {
      errorMessage(`Error finding plugins: ${error.message}`, 'Plugin Error');
      return [];
  }
};

const terserMinify = isProduction && !useSWC
  ? terser({
      keep_classnames: true,
      keep_fnames: true,
      output: {
          comments: false
      }
  })
  : [];

  const generateConfig = (options = {}) => {
    const { isServer } = options;
    
    const outputFile = isServer
        ? resolvePath([buildOutput, 'packages', 'core', 'index.js'])
        : resolvePath([buildOutput, 'client_packages', 'index.js']);

    const serverPlugins = [];
    const plugins = [terserMinify];

    // Get main entry point from main directory
    const mainEntry = resolvePath([sourcePath, 'main', isServer ? 'server' : 'client', 'index.ts']);
    
    // Safely get plugin entries
    const pluginEntries = getPluginEntries(isServer ? 'server' : 'client');
    const allEntries = [mainEntry, ...pluginEntries].filter(entry => {
        const exists = jetpack.exists(entry);
        if (!exists) {
            errorMessage(`Entry point not found: ${entry}`, 'Missing Entry');
        }
        return exists;
    });

    if (allEntries.length === 0) {
        errorMessage('No valid entry points found!', 'Configuration Error');
        process.exit(1);
    }

    const external = isServer ? [...builtinModules, ...localInstalledPackages] : [];
    const tsConfigPath = resolvePath([sourcePath, 'main', isServer ? 'server' : 'client', 'tsconfig.json']);

    // Get plugin names for globals configuration
    const pluginNames = pluginEntries.map(file => path.basename(path.dirname(path.dirname(file))));

    return {
        input: 'virtual-entry.js',
        output: {
            file: outputFile,
            format: isServer ? 'cjs' : 'iife',
            name: isServer ? undefined : 'ClientBundle',
            exports: 'named',
            interop: 'auto',
            esModule: false,
        },
        plugins: [
            {
                name: 'virtual-entry',
                resolveId(source) {
                    if (source === 'virtual-entry.js') return source;
                    return null;
                },
                load(id) {
                    if (id === 'virtual-entry.js') {
                        const imports = [
                            `import * as main from '${path.resolve(mainEntry)}';`,
                            ...pluginEntries.map((file, index) => {
                                const name = pluginNames[index];
                                return `import * as ${name} from '${path.resolve(file)}';`;
                            })
                        ].join('\n');

                        return `${imports}

const modules = {
    main,
    ${pluginNames.join(',\n    ')}
};

export default modules;
export { main, ${pluginNames.join(', ')} };`;
                    }
                    return null;
                }
            },
            {
                name: 'resolve-plugins',
                resolveId(source) {
                    // Ensure plugin paths are resolved correctly
                    if (pluginEntries.includes(source)) {
                        return path.resolve(source);
                    }
                    return null;
                }
            },
            tsPaths({ tsConfigPath }),
            nodeResolvePlugin({
                preferBuiltins: true,
                extensions: ['.js', '.ts', '.mjs', '.cjs', '.d.ts'],
                mainFields: ['main', 'module', 'types'],
                moduleDirectories: ['node_modules'],
                rootDir: sourcePath,
            }),
            jsonPlugin(),
            commonjsPlugin({
                include: [/\.js$/, /\.ts$/, /\.d.ts$/],
                transformMixedEsModules: true,
                extensions: ['.js'],
                requireReturnsDefault: 'auto',
                esmExternals: true,
                sourceMap: false,
                dynamicRequireTargets: [
                    'pg',
                    'mysql2',
                ]
            }),
            useSWC
                ? swc({
                    tsconfig: tsConfigPath,
                    minify: isProduction,
                    jsc: {
                        target: 'es2020',
                        parser: {
                            syntax: 'typescript',
                            dynamicImport: true,
                            decorators: true,
                            dts: true
                        },
                        transform: {
                            legacyDecorator: true,
                            decoratorMetadata: true
                        },
                        externalHelpers: true,
                        keepClassNames: true,
                        loose: true
                    }
                })
                : typescriptPlugin({
                    check: false,
                    tsconfig: tsConfigPath,
                    tsconfigOverride: {
                        include: [
                            'src/main/**/*.ts',
                            'src/plugin/**/*.ts'
                        ],
                        compilerOptions: {
                            rootDir: './src'
                        }
                    },
                    useTsconfigDeclarationDir: true,
                    declarationMap: true,
                }),
            isServer ? [...serverPlugins] : null,
            ...plugins
        ].filter(Boolean),
        external: isServer ? external : [],
        inlineDynamicImports: true,
        onwarn(warning, warn) {
            if (warning.code === 'CIRCULAR_DEPENDENCY') return;
            if (warning.code === 'THIS_IS_UNDEFINED') return;
            warn(warning);
        }
    };
};

const createValidName = (name, pluginPath = '') => {
  // Get plugin directory structure for uniqueness
  const pluginParts = pluginPath ? pluginPath.split('/').filter(Boolean) : [];
  const parts = [...pluginParts, name];
  
  // Convert to camelCase and ensure it's a valid JS identifier
  return 'Cef' + parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
};



const getVueEntries = () => {
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

const generateHtml = (entries) => {
  const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VRAGE-UI</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="./main.css">
    ${entries.map(entry => `<link rel="stylesheet" href="./${entry.name}.css">`).join('\n    ')}
</head>
<body>
    ${entries.map(entry => `<div id="${entry.name}"></div>`).join('\n    ')}
    
    ${entries.map(entry => `<script src="./${entry.name}.js"></script>`).join('\n    ')}
    
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        ${entries.map(entry => `
        const ${entry.varName}App = Vue.createApp(${entry.varName});
        ${entry.varName}App.mount('#${entry.name}');`).join('\n        ')}
    });
    </script>
</body>
</html>`;

  return template;
};

const mainCssConfig = {
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
      minimize: isProduction,
    }),
  ],
};



// Update Vue configuration generator
const generateVueConfig = (entry) => {
  const outputDir = path.join(buildOutput, 'client_packages', 'cef');
  
  return {
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
        extensions: ['.js', '.vue', '.json']
      }),
      commonjsPlugin({
        include: /node_modules/
      }),
      vuePlugin({
        preprocessStyles: true
      }),
      postcss({
        plugins: [
          postcssImport(),
          tailwindcss(),
          autoprefixer(),
        ],
        extract: `${entry.name}.css`,
        minimize: isProduction
      }),
      html({
        fileName: 'index.html',
        template: () => generateHtml(vueEntries)
      }),
      terserMinify
    ].filter(Boolean)
  };
};

// Export configurations
const vueEntries = getVueEntries();
const vueConfigs = vueEntries.length > 0 ? vueEntries.map(entry => generateVueConfig(entry)) : [];

export default [
  generateConfig({ isServer: true }), 
  generateConfig({ isServer: false }),
  mainCssConfig,
  ...vueConfigs
];
