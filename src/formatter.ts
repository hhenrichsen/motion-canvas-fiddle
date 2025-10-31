let prettierModule: typeof import('prettier/standalone') | null = null;
let parserBabelModule: typeof import('prettier/plugins/babel') | null = null;
let parserEstreeModule: typeof import('prettier/plugins/estree') | null = null;
let isLoading = false;

interface ImportStatement {
  source: string;
  defaultImport: string | null;
  namedImports: string[];
  namespaceImport: string | null;
  fullStatement: string;
}

/**
 * Combine multiple imports from the same source into a single import statement
 */
function combineImports(code: string): string {
  // Regex to match import statements
  const importRegex =
    /import\s+(?:(?:(\w+)|(\*\s+as\s+\w+)|\{([^}]+)\}|(?:(\w+)\s*,\s*\{([^}]+)\}))\s+from\s+)?['"]([^'"]+)['"]\s*;?/g;

  const imports: ImportStatement[] = [];
  const nonImportLines: string[] = [];
  let lastIndex = 0;

  // Parse all imports
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(code)) !== null) {
    // Add any code between imports
    const codeBetween = code.substring(lastIndex, match.index).trim();
    if (codeBetween && !codeBetween.match(/^\s*$/)) {
      nonImportLines.push(codeBetween);
    }

    const [
      fullStatement,
      defaultImport,
      namespaceImport,
      namedImportsOnly,
      defaultWithNamed,
      namedWithDefault,
      source,
    ] = match;

    const namedImports: string[] = [];
    const namedImportsStr = namedImportsOnly || namedWithDefault || '';

    if (namedImportsStr) {
      namedImportsStr.split(',').forEach((item) => {
        const trimmed = item.trim();
        if (trimmed) {
          namedImports.push(trimmed);
        }
      });
    }

    imports.push({
      source,
      defaultImport: defaultImport || defaultWithNamed || null,
      namedImports,
      namespaceImport: namespaceImport || null,
      fullStatement,
    });

    lastIndex = match.index + fullStatement.length;
  }

  // Add remaining code after last import
  const remainingCode = code.substring(lastIndex).trim();

  // Group imports by source
  const importsBySource = new Map<string, ImportStatement[]>();
  for (const imp of imports) {
    if (!importsBySource.has(imp.source)) {
      importsBySource.set(imp.source, []);
    }
    importsBySource.get(imp.source)!.push(imp);
  }

  // Combine imports from the same source
  const combinedImports: string[] = [];
  for (const [source, sourceImports] of importsBySource) {
    let defaultImport: string | null = null;
    let namespaceImport: string | null = null;
    const allNamedImports = new Set<string>();

    for (const imp of sourceImports) {
      if (imp.defaultImport && !defaultImport) {
        defaultImport = imp.defaultImport;
      }
      if (imp.namespaceImport && !namespaceImport) {
        namespaceImport = imp.namespaceImport;
      }
      imp.namedImports.forEach((named) => allNamedImports.add(named));
    }

    // Build combined import statement
    let importStatement = 'import ';
    const parts: string[] = [];

    if (defaultImport) {
      parts.push(defaultImport);
    }

    if (namespaceImport) {
      parts.push(namespaceImport);
    }

    if (allNamedImports.size > 0) {
      const sortedNamedImports = Array.from(allNamedImports).sort();
      parts.push(`{${sortedNamedImports.join(', ')}}`);
    }

    if (parts.length > 0) {
      importStatement += parts.join(', ') + ' from ';
    }

    importStatement += `'${source}';`;
    combinedImports.push(importStatement);
  }

  // Reconstruct code with combined imports
  const result: string[] = [];
  if (combinedImports.length > 0) {
    result.push(combinedImports.join('\n'));
  }
  if (nonImportLines.length > 0) {
    result.push(nonImportLines.join('\n'));
  }
  if (remainingCode) {
    result.push(remainingCode);
  }

  return result.join('\n\n');
}

/**
 * Lazily load Prettier and its plugins in the background
 * This starts loading but doesn't block execution
 */
function startLoadingPrettier(): void {
  if (prettierModule && parserBabelModule && parserEstreeModule) {
    return;
  }

  if (isLoading) {
    return;
  }

  isLoading = true;

  Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ])
    .then(([prettier, parserBabel, parserEstree]) => {
      prettierModule = prettier;
      parserBabelModule = parserBabel;
      parserEstreeModule = parserEstree;
      isLoading = false;
    })
    .catch((error) => {
      console.warn("Failed to load Prettier:", error);
      isLoading = false;
    });
}

/**
 * Preload Prettier in the background
 * Call this after the main application has loaded to prepare formatting
 */
export function preloadPrettier(): void {
  startLoadingPrettier();
}

/**
 * Format TypeScript/JavaScript code using Prettier standalone
 * Combines duplicate imports and formats the code.
 * Only formats if Prettier is already loaded. If not loaded, returns original code immediately.
 * This ensures formatting never blocks compilation or saves.
 *
 * @param code - The code to format
 * @returns The formatted code, or original code if Prettier not loaded
 */
export function formatCode(code: string): Promise<string> {
  // Start loading Prettier in the background if not already loaded/loading
  startLoadingPrettier();

  // Combine imports first
  let processedCode = code;
  try {
    processedCode = combineImports(code);
  } catch (error) {
    console.warn('Failed to combine imports:', error);
    // Continue with original code if import combining fails
    processedCode = code;
  }

  // If Prettier is not loaded yet, return processed code immediately
  if (!prettierModule || !parserBabelModule || !parserEstreeModule) {
    return Promise.resolve(processedCode);
  }

  try {
    const formatted = prettierModule.format(processedCode, {
      parser: 'babel-ts',
      plugins: [parserBabelModule, parserEstreeModule],
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      bracketSpacing: false,
    });

    return formatted;
  } catch (error) {
    // If formatting fails, return the processed code (with combined imports)
    // This ensures the user's code is never lost due to syntax errors
    console.warn('Failed to format code:', error);
    return Promise.resolve(processedCode);
  }
}
