import { detectFeatures, isWebContainerAvailable, explainFeatures } from './feature-detector';
import { compileWithWebContainer, type CompilationProgress, type Logger } from './webcontainer-compiler';

interface CompilationContext {
  hasCanvasCommons: boolean;
}

export interface CompileOptions {
  loadCanvasCommons?: () => Promise<unknown>;
  onProgress?: (progress: CompilationProgress) => void;
  forceWebContainer?: boolean;
  forceBabel?: boolean;
  logger?: Logger;
}

export async function compileScene(
  code: string,
  options?: CompileOptions | (() => Promise<unknown>)
): Promise<unknown> {
  // Handle legacy API (loadCanvasCommons function as second parameter)
  const opts: CompileOptions = typeof options === 'function'
    ? { loadCanvasCommons: options }
    : options || {};

  // Detect features that might require WebContainer
  const features = detectFeatures(code);

  console.log('[Compiler] Feature detection:', features);
  console.log('[Compiler]', explainFeatures(features));

  // Determine compilation strategy
  const shouldUseWebContainer =
    !opts.forceBabel &&
    (opts.forceWebContainer || features.needsWebContainer) &&
    isWebContainerAvailable();

  if (shouldUseWebContainer) {
    console.log('[Compiler] Using WebContainer (Vite) compilation');
    opts.logger?.info('[Compiler] Using WebContainer (Vite) compilation');
    try {
      // Load canvas-commons if needed
      if (features.externalPackages.includes('@hhenrichsen/canvas-commons') && opts.loadCanvasCommons) {
        await opts.loadCanvasCommons();
      }

      return await compileWithWebContainer(code, features, opts.onProgress, opts.logger);
    } catch (error) {
      console.error('[Compiler] WebContainer compilation failed:', error);

      // Fall back to Babel if WebContainer fails (unless forced)
      if (opts.forceWebContainer) {
        throw error;
      }

      console.warn('[Compiler] Falling back to Babel compilation');
      opts.logger?.warn('[Compiler] Falling back to Babel compilation');
      return await compileWithBabel(code, opts.loadCanvasCommons);
    }
  } else {
    console.log('[Compiler] Using Babel compilation');
    opts.logger?.info('[Compiler] Using Babel compilation');
    return await compileWithBabel(code, opts.loadCanvasCommons);
  }
}

async function compileWithBabel(
  code: string,
  loadCanvasCommons?: () => Promise<unknown>
): Promise<unknown> {
  try {
    const Babel = await import("@babel/standalone");

    const filename = "fiddle.tsx";
    const undeclaredVariables = new Set();
    const errors: { from: number; to: number; tooltip: string }[] = [];
    let result: { code: string } | null = null;
    let errorMessage: string | null = null;
    const context: CompilationContext = { hasCanvasCommons: false };

    const globals = new Set([
      "console",
      "window",
      "document",
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      "fetch",
      "URL",
      "Blob",
      "Promise",
      "Array",
      "Object",
      "Math",
      "Date",
      "JSON",
      "parseInt",
      "parseFloat",
      "isNaN",
      "isFinite",
    ]);

    try {
      const transformResult = Babel.transform(code, {
        filename,
        presets: [
          [
            "typescript",
            {
              allExtensions: true,
              isTSX: true,
            },
          ],
          [
            "react",
            {
              runtime: "automatic",
              importSource: "@motion-canvas/2d",
            },
          ],
        ],
        plugins: [
          ({ types }) => ({
            visitor: {
              ImportDeclaration(path: any) {
                if (path.node.source.value.startsWith("@motion-canvas/core")) {
                  path.node.source.value = "@motion-canvas/core";
                }
                if (path.node.source.value.startsWith("@motion-canvas/2d")) {
                  path.node.source.value = "@motion-canvas/2d";
                }
                if (
                  path.node.source.value.startsWith(
                    "@hhenrichsen/canvas-commons"
                  )
                ) {
                  context.hasCanvasCommons = true;
                  path.node.source.value = "@hhenrichsen/canvas-commons";
                }
              },
              ReferencedIdentifier(path: any) {
                const { node, scope } = path;

                if (
                  types.isIdentifier(node) &&
                  !scope.hasBinding(node.name) &&
                  !globals.has(node.name)
                ) {
                  undeclaredVariables.add(node.name);
                  errors.push({
                    from: node.start,
                    to: node.end,
                    tooltip: `Cannot find name '${node.name}'.`,
                  });
                }
              },
            },
          }),
        ],
      });

      if (!transformResult || !transformResult.code) {
        throw new Error("Babel transformation failed");
      }

      result = { code: transformResult.code };
    } catch (error: any) {
      const match = /(.*) \(\d+:\d+\)/.exec(
        error.message.slice(filename.length + 1)
      );
      errorMessage = match ? match[1] : error.message;
      if (error.loc) {
        errors.push({
          from: error.pos as number,
          to: error.pos as number,
          tooltip: errorMessage || "Unknown error",
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(
        errorMessage ??
          `Cannot find names: ${Array.from(undeclaredVariables).join(
            ", "
          )}\nDid you forget to import them?`
      );
    }

    // Load canvas-commons if needed
    if (context.hasCanvasCommons && loadCanvasCommons) {
      await loadCanvasCommons();
    }

    if (!result) {
      throw new Error("Compilation failed");
    }

    let finalCode = replaceImportsWithGlobals(result.code);
    const sceneModule = await executeCompiledCode(finalCode);

    if (!sceneModule.default) {
      throw new Error("Code must export a default scene");
    }

    return sceneModule.default;
  } catch (error: any) {
    throw new Error(`Compilation error: ${error.message}`);
  }
}

function replaceImportsWithGlobals(code: string): string {
  let finalCode = code;

  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@motion-canvas\/core['"]/g,
    (_match, imports) => {
      const importItems = imports.split(",").map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(" as ")) {
          const [original, alias] = trimmed.split(" as ").map((s) => s.trim());
          return `const ${alias} = window.CanvasCore.${original};`;
        } else {
          return `const ${trimmed} = window.CanvasCore.${trimmed};`;
        }
      });
      return importItems.join("\n");
    }
  );

  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@motion-canvas\/2d['"]/g,
    (_match, imports) => {
      const importItems = imports.split(",").map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(" as ")) {
          const [original, alias] = trimmed.split(" as ").map((s) => s.trim());
          return `const ${alias} = window.Canvas2D.${original};`;
        } else {
          return `const ${trimmed} = window.Canvas2D.${trimmed};`;
        }
      });
      return importItems.join("\n");
    }
  );

  finalCode = finalCode.replace(
    /import\s+(\w+)\s*from\s*['"]@motion-canvas\/(core|2d)['"]/g,
    (_match, importName, packageName) => {
      const moduleName = packageName === "core" ? "CanvasCore" : "Canvas2D";
      return `const ${importName} = window.${moduleName}.${importName};`;
    }
  );

  // Handle canvas-commons imports
  finalCode = finalCode.replace(
    /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@hhenrichsen\/canvas-commons['"]/g,
    (_match, imports) => {
      const importItems = imports.split(",").map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.includes(" as ")) {
          const [original, alias] = trimmed.split(" as ").map((s) => s.trim());
          return `const ${alias} = window.CanvasCommons.${original};`;
        } else {
          return `const ${trimmed} = window.CanvasCommons.${trimmed};`;
        }
      });
      return importItems.join("\n");
    }
  );

  finalCode = finalCode.replace(
    /import\s+(\w+)\s*from\s*['"]@hhenrichsen\/canvas-commons['"]/g,
    (_match, importName) => {
      return `const ${importName} = window.CanvasCommons.${importName};`;
    }
  );

  return finalCode;
}

async function executeCompiledCode(code: string): Promise<{ default: unknown }> {
  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(
      /* @vite-ignore */
      url
    );
    return module;
  } finally {
    URL.revokeObjectURL(url);
  }
}
