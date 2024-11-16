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

export const generateConfig = (options = {}) => {
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

      external: (id) => {
        if (!isServer) return false;
        
        // Normalize the id to handle different path formats
        const normalizedId = id.replace(/\\/g, '/');
        
        // Check if it's a builtin module
        if (builtinModules.includes(id)) return true;
        
        // Check if it's a node_modules package
        if (normalizedId.includes('node_modules')) return true;
        
        // Check package name without path
        const pkgName = normalizedId.split('/')[0];
        
        // Check if it's one of the installed packages
        return localInstalledPackages.some(pkg => {
            // Handle scoped packages (e.g., @types/node)
            if (pkg.startsWith('@')) {
                const [scope, name] = pkg.split('/');
                return normalizedId.startsWith(`${scope}/${name}`);
            }
            return pkgName === pkg || normalizedId.startsWith(`${pkg}/`);
        });
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
                      rootDir: './src',
                      declaration: false,  // Disable declaration file generation
                      declarationMap: false
                    }
                  }
                }),
            isServer ? [...serverPlugins] : null,
            ...plugins
        ].filter(Boolean),
    };
};
