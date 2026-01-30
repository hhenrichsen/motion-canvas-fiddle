/**
 * Feature Detection Module
 *
 * Detects TypeScript/JavaScript features that require WebContainer compilation
 * instead of Babel. Uses lightweight regex patterns for fast detection.
 */

export interface FeatureFlags {
  /** Whether the code uses TypeScript decorators (@decorator syntax) */
  hasDecorators: boolean;

  /** Whether the code has multiple exports or re-exports */
  hasComplexExports: boolean;

  /** Whether the code imports external packages not bundled in fiddle */
  hasExternalPackages: boolean;

  /** List of detected external package names */
  externalPackages: string[];

  /** Whether WebContainer compilation is needed */
  needsWebContainer: boolean;
}

// Known bundled packages that don't require WebContainer
const BUNDLED_PACKAGES = new Set([
  "@motion-canvas/core",
  "@motion-canvas/2d",
  "@hhenrichsen/canvas-commons",
  "@spidunno/motion-canvas-graphing",
  "three",
  "shiki",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  "@lezer/cpp",
  "@lezer/css",
  "@lezer/go",
  "@lezer/html",
  "@lezer/java",
  "@lezer/javascript",
  "@lezer/json",
  "@lezer/markdown",
  "@lezer/php",
  "@lezer/python",
  "@lezer/rust",
  "@lezer/sass",
  "@lezer/xml",
  "@lezer/yaml",
]);

/**
 * Detect features in user code that require WebContainer compilation
 */
export function detectFeatures(code: string): FeatureFlags {
  const flags: FeatureFlags = {
    hasDecorators: false,
    hasComplexExports: false,
    hasExternalPackages: false,
    externalPackages: [],
    needsWebContainer: false,
  };

  // Remove comments to avoid false positives
  const codeWithoutComments = removeComments(code);

  // Check for decorators
  flags.hasDecorators = detectDecorators(codeWithoutComments);

  // Check for complex export patterns
  flags.hasComplexExports = detectComplexExports(codeWithoutComments);

  // Check for external package imports
  const externalPackages = detectExternalPackages(codeWithoutComments);
  flags.hasExternalPackages = externalPackages.length > 0;
  flags.externalPackages = externalPackages;

  // Determine if WebContainer is needed
  flags.needsWebContainer =
    flags.hasDecorators || flags.hasComplexExports || flags.hasExternalPackages;

  return flags;
}

/**
 * Remove single-line and multi-line comments from code
 */
function removeComments(code: string): string {
  // Remove multi-line comments
  let result = code.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove single-line comments (but preserve URLs)
  result = result.replace(/(?<!:)\/\/.*/g, "");

  return result;
}

/**
 * Detect TypeScript decorators
 * Matches: @decorator, @decorator(), @decorator(args)
 */
function detectDecorators(code: string): boolean {
  // Pattern: @ followed by identifier, optionally followed by ()
  // Must be followed by class, method, property, get, set, or parameter
  const decoratorPattern =
    /@\w+(\([^)]*\))?\s*(?:class|get|set|async|static|public|private|protected|readonly|\w+\s*[:(])/;

  return decoratorPattern.test(code);
}

/**
 * Detect complex export patterns that might need special handling
 */
function detectComplexExports(code: string): boolean {
  // Count number of exports
  const exportMatches = code.match(
    /\bexport\s+(class|function|const|let|var|type|interface|enum)/g,
  );
  const exportCount = exportMatches ? exportMatches.length : 0;

  // Check for re-exports
  const hasReexports = /export\s+\*\s+from|export\s+\{[^}]+\}\s+from/.test(
    code,
  );

  // Check for export default AND other exports (mixed exports)
  const hasDefaultExport = /export\s+default/.test(code);
  const hasNamedExports = exportCount > 0;
  const hasMixedExports =
    hasDefaultExport && hasNamedExports && exportCount > 1;

  // Consider it complex if:
  // - Has re-exports
  // - Has many exports (> 3)
  // - Has mixed default and named exports with multiple items
  return hasReexports || exportCount > 3 || hasMixedExports;
}

/**
 * Detect external package imports (not bundled in fiddle)
 */
function detectExternalPackages(code: string): string[] {
  const externalPackages: string[] = [];

  // Match import statements
  // Matches: import ... from 'package' or import ... from "package"
  const importPattern = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  const seenPackages = new Set<string>();

  while ((match = importPattern.exec(code)) !== null) {
    const importPath = match[1];

    // Skip relative imports (start with . or /)
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
      continue;
    }

    // Extract package name (handle scoped packages like @org/package)
    let packageName: string;
    if (importPath.startsWith("@")) {
      // Scoped package: @org/package or @org/package/subpath
      const parts = importPath.split("/");
      packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    } else {
      // Regular package: package or package/subpath
      packageName = importPath.split("/")[0];
    }

    // Check if it's a bundled package
    if (!BUNDLED_PACKAGES.has(packageName) && !seenPackages.has(packageName)) {
      seenPackages.add(packageName);
      externalPackages.push(packageName);
    }
  }

  return externalPackages;
}

// Packages to exclude from analytics (always used, not interesting)
const ANALYTICS_EXCLUDED_PACKAGES = new Set([
  "@motion-canvas/core",
  "@motion-canvas/2d",
]);

// Special relative imports that map to known packages
const SPECIAL_RELATIVE_IMPORTS: Record<string, string> = {
  "./shiki": "ShikiHighlighter",
};

/**
 * Detect ALL package imports for analytics (includes bundled packages)
 * Excludes core Motion Canvas packages since they're always used.
 */
export function detectAllPackages(code: string): string[] {
  const packages: string[] = [];

  // Remove comments to avoid false positives
  const codeWithoutComments = removeComments(code);

  // Match import statements
  const importPattern = /import\s+(?:[\w{},\s*]+\s+from\s+)?['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  const seenPackages = new Set<string>();

  while ((match = importPattern.exec(codeWithoutComments)) !== null) {
    const importPath = match[1];

    // Check for special relative imports first
    if (SPECIAL_RELATIVE_IMPORTS[importPath]) {
      const mappedPackage = SPECIAL_RELATIVE_IMPORTS[importPath];
      if (!seenPackages.has(mappedPackage)) {
        seenPackages.add(mappedPackage);
        packages.push(mappedPackage);
      }
      continue;
    }

    // Skip other relative imports (start with . or /)
    if (importPath.startsWith(".") || importPath.startsWith("/")) {
      continue;
    }

    // Extract package name (handle scoped packages like @org/package)
    let packageName: string;
    if (importPath.startsWith("@")) {
      // Scoped package: @org/package or @org/package/subpath
      const parts = importPath.split("/");
      packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    } else {
      // Regular package: package or package/subpath
      packageName = importPath.split("/")[0];
    }

    // Skip excluded packages and duplicates
    if (
      !ANALYTICS_EXCLUDED_PACKAGES.has(packageName) &&
      !seenPackages.has(packageName)
    ) {
      seenPackages.add(packageName);
      packages.push(packageName);
    }
  }

  return packages;
}

/**
 * Generate a user-friendly explanation of why WebContainer is needed
 */
export function explainFeatures(flags: FeatureFlags): string {
  if (!flags.needsWebContainer) {
    return "Using fast Babel compilation";
  }

  const reasons: string[] = [];

  if (flags.hasDecorators) {
    reasons.push("TypeScript decorators detected");
  }

  if (flags.hasComplexExports) {
    reasons.push("Complex export patterns detected");
  }

  if (flags.hasExternalPackages) {
    reasons.push(`External packages: ${flags.externalPackages.join(", ")}`);
  }

  return `Using Vite (WebContainer) compilation: ${reasons.join("; ")}`;
}

/**
 * Check if WebContainer is available in the current environment
 */
export function isWebContainerAvailable(): boolean {
  // WebContainer requires:
  // 1. Service worker support
  // 2. SharedArrayBuffer (cross-origin isolation)
  // 3. Secure context (HTTPS or localhost)

  if (!window.isSecureContext) {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  // Cross-origin isolation is required for SharedArrayBuffer
  // This might not be available immediately if service worker just registered
  return window.crossOriginIsolated === true;
}
