/**
 * WebContainer Compiler Module
 *
 * Compiles Motion Canvas scenes using Vite in a WebContainer.
 * Supports advanced TypeScript features like decorators and external packages.
 */

import { WebContainer } from '@webcontainer/api';
import type { FeatureFlags } from './feature-detector';

export interface CompilationProgress {
  stage: 'boot' | 'install' | 'write' | 'build' | 'extract' | 'complete';
  message: string;
  progress: number; // 0-100
}

export type ProgressCallback = (progress: CompilationProgress) => void;

export interface Logger {
  log: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
}

interface WebContainerState {
  instance: WebContainer | null;
  booted: boolean;
  installing: boolean;
  lastDependencies: string[];
}

const state: WebContainerState = {
  instance: null,
  booted: false,
  installing: false,
  lastDependencies: [],
};

// Base dependencies always included
const BASE_DEPENDENCIES: Record<string, string> = {
  '@motion-canvas/core': '^3.17.2',
  '@motion-canvas/2d': '^3.17.2',
  '@hhenrichsen/canvas-commons': '^0.10.2',
  'vite': '^5.0.0',
  'typescript': '^5.3.3',
};

/**
 * Boot the WebContainer instance (singleton)
 */
async function bootWebContainer(onProgress?: ProgressCallback): Promise<WebContainer> {
  if (state.instance && state.booted) {
    return state.instance;
  }

  onProgress?.({
    stage: 'boot',
    message: 'Initializing build environment...',
    progress: 10,
  });

  try {
    state.instance = await WebContainer.boot();
    state.booted = true;

    console.log('[WebContainer] Booted successfully');

    return state.instance;
  } catch (error) {
    console.error('[WebContainer] Boot failed:', error);
    throw new Error(`Failed to initialize build environment: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create the virtual file system structure
 */
function createFileSystem(code: string, features: FeatureFlags): Record<string, any> {
  // Determine dependencies based on detected features
  const dependencies = { ...BASE_DEPENDENCIES };

  // Add external packages if detected
  for (const pkg of features.externalPackages) {
    dependencies[pkg] = 'latest';
  }

  const packageJson = {
    name: 'motion-canvas-scene',
    type: 'module',
    private: true,
    scripts: {
      build: 'vite build',
    },
    dependencies,
  };

  const viteConfig = `
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/scene.tsx',
      formats: ['es'],
      fileName: 'scene',
    },
    rollupOptions: {
      external: [
        '@motion-canvas/core',
        '@motion-canvas/2d',
        '@motion-canvas/2d/jsx-runtime',
        '@motion-canvas/2d/lib/jsx-runtime',
        '@hhenrichsen/canvas-commons',
      ],
    },
    minify: false,
    sourcemap: false,
    target: 'esnext',
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@motion-canvas/2d',
  },
});
`.trim();

  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      jsx: 'react-jsx',
      jsxImportSource: '@motion-canvas/2d',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
  };

  return {
    'package.json': {
      file: {
        contents: JSON.stringify(packageJson, null, 2),
      },
    },
    'vite.config.ts': {
      file: {
        contents: viteConfig,
      },
    },
    'tsconfig.json': {
      file: {
        contents: JSON.stringify(tsConfig, null, 2),
      },
    },
    src: {
      directory: {
        'scene.tsx': {
          file: {
            contents: code,
          },
        },
      },
    },
  };
}

/**
 * Install dependencies in the WebContainer
 */
async function installDependencies(
  container: WebContainer,
  features: FeatureFlags,
  onProgress?: ProgressCallback,
  logger?: Logger
): Promise<void> {
  // Check if we need to reinstall (dependencies changed)
  const currentDeps = [...BASE_DEPENDENCIES && Object.keys(BASE_DEPENDENCIES), ...features.externalPackages].sort();
  const needsInstall = JSON.stringify(currentDeps) !== JSON.stringify(state.lastDependencies);

  if (!needsInstall && state.lastDependencies.length > 0) {
    console.log('[WebContainer] Dependencies cached, skipping install');
    logger?.info('[WebContainer] Dependencies cached, skipping install');
    return;
  }

  if (state.installing) {
    throw new Error('Installation already in progress');
  }

  state.installing = true;

  try {
    onProgress?.({
      stage: 'install',
      message: 'Installing dependencies...',
      progress: 30,
    });

    logger?.info('[npm] Installing dependencies...');

    const installProcess = await container.spawn('npm', ['install']);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log('[npm install]', data);
          logger?.log(data);
        },
      })
    );

    const exitCode = await installProcess.exit;

    if (exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${exitCode}`);
    }

    state.lastDependencies = currentDeps;
    console.log('[WebContainer] Dependencies installed');
    logger?.info('[WebContainer] Dependencies installed successfully');
  } finally {
    state.installing = false;
  }
}

/**
 * Build the scene with Vite
 */
async function buildScene(
  container: WebContainer,
  onProgress?: ProgressCallback,
  logger?: Logger
): Promise<string> {
  onProgress?.({
    stage: 'build',
    message: 'Building with Vite...',
    progress: 60,
  });

  logger?.info('[vite] Building scene...');

  const buildProcess = await container.spawn('npm', ['run', 'build']);

  let buildOutput = '';

  buildProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        buildOutput += data;
        console.log('[vite build]', data);
        logger?.log(data);
      },
    })
  );

  const exitCode = await buildProcess.exit;

  if (exitCode !== 0) {
    console.error('[WebContainer] Build output:', buildOutput);
    logger?.error(`[vite] Build failed:\n${buildOutput}`);

    // Extract the actual error message from the build output
    const errorLines = buildOutput.split('\n');
    const errorIndex = errorLines.findIndex(line => line.includes('error during build:') || line.includes('Error:'));
    const relevantError = errorIndex >= 0
      ? errorLines.slice(errorIndex, errorIndex + 10).join('\n')
      : buildOutput.slice(-500);

    throw new Error(`Vite build failed:\n${relevantError}`);
  }

  console.log('[WebContainer] Build successful');
  logger?.info('[vite] Build successful');

  return buildOutput;
}

/**
 * Extract the built scene module from WebContainer
 */
async function extractBuiltScene(
  container: WebContainer,
  onProgress?: ProgressCallback
): Promise<string> {
  onProgress?.({
    stage: 'extract',
    message: 'Extracting compiled scene...',
    progress: 90,
  });

  try {
    // Read the built file from dist/scene.js
    const builtFile = await container.fs.readFile('/dist/scene.js', 'utf-8');

    if (!builtFile || builtFile.trim().length === 0) {
      throw new Error('Built file is empty');
    }

    console.log('[WebContainer] Scene extracted successfully');

    return builtFile;
  } catch (error) {
    console.error('[WebContainer] Extract failed:', error);
    throw new Error(`Failed to extract built scene: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Replace imports with global window references
 */
function replaceImportsWithGlobals(code: string): string {
  let finalCode = code;

  // Replace Motion Canvas Core imports
  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@motion-canvas\/core['"]/g,
    (_match, imports) => {
      const importItems = imports.split(',').map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(' as ')) {
          const [original, alias] = trimmed.split(' as ').map((s: string) => s.trim());
          return `const ${alias} = window.CanvasCore.${original};`;
        } else {
          return `const ${trimmed} = window.CanvasCore.${trimmed};`;
        }
      });
      return importItems.join('\n');
    }
  );

  // Replace Motion Canvas 2D imports
  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@motion-canvas\/2d['"]/g,
    (_match, imports) => {
      const importItems = imports.split(',').map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(' as ')) {
          const [original, alias] = trimmed.split(' as ').map((s: string) => s.trim());
          return `const ${alias} = window.Canvas2D.${original};`;
        } else {
          return `const ${trimmed} = window.Canvas2D.${trimmed};`;
        }
      });
      return importItems.join('\n');
    }
  );

  // Replace Motion Canvas 2D JSX runtime imports (both paths)
  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@motion-canvas\/2d\/(lib\/)?jsx-runtime['"]/g,
    (_match, imports) => {
      const importItems = imports.split(',').map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(' as ')) {
          const [original, alias] = trimmed.split(' as ').map((s: string) => s.trim());
          return `const ${alias} = window.Canvas2D.${original};`;
        } else {
          return `const ${trimmed} = window.Canvas2D.${trimmed};`;
        }
      });
      return importItems.join('\n');
    }
  );

  // Replace Canvas Commons imports
  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@hhenrichsen\/canvas-commons['"]/g,
    (_match, imports) => {
      const importItems = imports.split(',').map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(' as ')) {
          const [original, alias] = trimmed.split(' as ').map((s: string) => s.trim());
          return `const ${alias} = window.CanvasCommons.${original};`;
        } else {
          return `const ${trimmed} = window.CanvasCommons.${trimmed};`;
        }
      });
      return importItems.join('\n');
    }
  );

  return finalCode;
}

/**
 * Execute compiled code and return the scene module
 */
async function executeCompiledCode(code: string): Promise<{ default: unknown }> {
  const blob = new Blob([code], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);
    return module;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compile a Motion Canvas scene using WebContainer + Vite
 */
export async function compileWithWebContainer(
  code: string,
  features: FeatureFlags,
  onProgress?: ProgressCallback,
  logger?: Logger
): Promise<unknown> {
  try {
    logger?.info('[WebContainer] Starting compilation...');

    // Boot WebContainer
    const container = await bootWebContainer(onProgress);

    // Create and mount file system
    onProgress?.({
      stage: 'write',
      message: 'Setting up project files...',
      progress: 20,
    });

    const files = createFileSystem(code, features);
    await container.mount(files);

    console.log('[WebContainer] File system mounted');
    logger?.info('[WebContainer] Project files ready');

    // Install dependencies
    await installDependencies(container, features, onProgress, logger);

    // Build with Vite
    await buildScene(container, onProgress, logger);

    // Extract built scene
    const builtCode = await extractBuiltScene(container, onProgress);

    // Replace imports with globals
    const finalCode = replaceImportsWithGlobals(builtCode);

    // Execute and return the scene
    const sceneModule = await executeCompiledCode(finalCode);

    if (!sceneModule.default) {
      throw new Error('Compiled code must export a default scene');
    }

    onProgress?.({
      stage: 'complete',
      message: 'Compilation complete',
      progress: 100,
    });

    console.log('[WebContainer] Compilation successful');
    logger?.info('[WebContainer] Compilation complete!');

    return sceneModule.default;
  } catch (error) {
    console.error('[WebContainer] Compilation failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error(`[WebContainer] Compilation failed: ${errorMessage}`);
    throw new Error(`WebContainer compilation failed: ${errorMessage}`);
  }
}

/**
 * Check if WebContainer is ready to use
 */
export function isWebContainerReady(): boolean {
  return state.booted && state.instance !== null;
}

/**
 * Get the WebContainer instance (if booted)
 */
export function getWebContainerInstance(): WebContainer | null {
  return state.instance;
}
