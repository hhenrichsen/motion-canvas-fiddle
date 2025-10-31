import { javascriptLanguage } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import type {
  CompletionContext,
  Completion,
} from "@codemirror/autocomplete";
import type { EditorView } from "@codemirror/view";

function isConstructor(obj: unknown): boolean {
  if (typeof obj !== "function") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(obj as any).prototype && !!(obj as any).prototype.constructor.name;
}

interface CompletionOption extends Completion {
  label: string;
  type: string;
  package: string;
  apply?: (view: EditorView, completion: Completion, from: number, to: number) => void;
}

const Options: CompletionOption[] = [];

function loadModule(packageName: string, module: Record<string, unknown>): void {
  Object.entries(module).forEach(([name, value]) => {
    const option: CompletionOption = {
      label: name,
      type:
        typeof value === "function"
          ? isConstructor(value)
            ? "class"
            : "function"
          : "variable",
      package: packageName,
      apply: (view: EditorView, completion: Completion, from: number, to: number) => {
        // Insert the completion text
        view.dispatch({
          changes: { from, to, insert: completion.label },
        });

        // Add import if needed
        addImportIfNeeded(view, completion.label, packageName);
      },
    };
    Options.push(option);
  });
}

function addImportIfNeeded(
  view: EditorView,
  symbol: string,
  packageName: string
): void {
  const doc = view.state.doc.toString();
  const lines = doc.split("\n");

  // Check if the symbol is already imported from this package
  const importRegex = new RegExp(
    `import\\s+{[^}]*\\b${symbol}\\b[^}]*}\\s+from\\s+['"]${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
  );
  if (importRegex.test(doc)) {
    return; // Already imported
  }

  // Find existing import from the same package
  const existingImportRegex = new RegExp(
    `import\\s+{([^}]*)}\\s+from\\s+['"]${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
  );
  const existingImportMatch = doc.match(existingImportRegex);

  if (existingImportMatch) {
    // Add to existing import
    const existingImports = existingImportMatch[1];
    const importStart = doc.indexOf(existingImportMatch[0]);
    const importEnd = importStart + existingImportMatch[0].length;

    // Parse existing imports and add the new one
    const imports = existingImports
      .split(",")
      .map((imp) => imp.trim())
      .filter((imp) => imp.length > 0);
    imports.push(symbol);
    imports.sort();

    const newImport = `import { ${imports.join(", ")} } from '${packageName}';`;

    view.dispatch({
      changes: { from: importStart, to: importEnd, insert: newImport },
    });
  } else {
    // Add new import statement
    // Find the position after the last import or at the beginning
    let insertPos = 0;
    let lastImportLine = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("import ")) {
        lastImportLine = i;
      } else if (lastImportLine !== -1 && lines[i].trim() !== "") {
        break;
      }
    }

    if (lastImportLine !== -1) {
      // Insert after the last import
      insertPos = lines
        .slice(0, lastImportLine + 1)
        .join("\n").length + 1;
    }

    const newImport = `import { ${symbol} } from '${packageName}';\n`;

    view.dispatch({
      changes: { from: insertPos, insert: newImport },
    });
  }
}

// Load Motion Canvas modules for autocompletion
import("@motion-canvas/core")
  .then((module) => loadModule("@motion-canvas/core", module))
  .catch((error) => {
    console.warn("Failed to load @motion-canvas/core for autocompletion:", error);
  });

import("@motion-canvas/2d")
  .then((module) => loadModule("@motion-canvas/2d", module))
  .catch((error) => {
    console.warn("Failed to load @motion-canvas/2d for autocompletion:", error);
  });

// Load additional libraries for autocompletion
import("@hhenrichsen/canvas-commons")
  .then((module) => loadModule("@hhenrichsen/canvas-commons", module))
  .catch((error) => {
    console.warn("Failed to load @hhenrichsen/canvas-commons for autocompletion:", error);
  });

import("@spidunno/motion-canvas-graphing")
  .then((module) => loadModule("@spidunno/motion-canvas-graphing", module))
  .catch((error) => {
    console.warn("Failed to load @spidunno/motion-canvas-graphing for autocompletion:", error);
  });

import("three")
  .then((module) => loadModule("three", module))
  .catch((error) => {
    console.warn("Failed to load three for autocompletion:", error);
  });

import("shiki")
  .then((module) => loadModule("shiki", module))
  .catch((error) => {
    console.warn("Failed to load shiki for autocompletion:", error);
  });

// Add hardcoded ShikiHighlighter completions (local module)
const shikiHighlighterOptions: CompletionOption[] = [
  {
    label: 'ShikiHighlighter',
    type: 'class',
    package: './shiki',
    detail: 'Code highlighter using Shiki',
    apply: (view: EditorView, completion: Completion, from: number, to: number) => {
      view.dispatch({
        changes: { from, to, insert: completion.label },
      });
      addImportIfNeeded(view, completion.label, './shiki');
    },
  },
  {
    label: 'ShikiOptions',
    type: 'type',
    package: './shiki',
    detail: 'Options for ShikiHighlighter',
    apply: (view: EditorView, completion: Completion, from: number, to: number) => {
      view.dispatch({
        changes: { from, to, insert: completion.label },
      });
      addImportIfNeeded(view, completion.label, './shiki');
    },
  },
];

Options.push(...shikiHighlighterOptions);

// Add lezer parser snippet completions
const lezerLanguages = [
  'cpp', 'css', 'go', 'html', 'java', 'javascript',
  'json', 'markdown', 'php', 'python', 'rust', 'sass', 'xml', 'yaml'
];

for (const lang of lezerLanguages) {
  const option: CompletionOption = {
    label: `lezer:${lang}`,
    type: "snippet",
    package: `@lezer/${lang}`,
    detail: `Import ${lang} parser`,
    info: `Adds: import { parser as ${lang} } from '@lezer/${lang}';`,
    apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
      // Remove the trigger text
      view.dispatch({
        changes: { from, to, insert: "" },
      });

      // Add the import at the top
      addLezerParserImport(view, lang);
    },
  };
  Options.push(option);
}

function addLezerParserImport(view: EditorView, language: string): void {
  const doc = view.state.doc.toString();
  const packageName = `@lezer/${language}`;

  // Check if this parser import already exists
  const importRegex = new RegExp(
    `import\\s+{[^}]*\\bparser\\s+as\\s+${language}\\b[^}]*}\\s+from\\s+['"]${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]`
  );
  if (importRegex.test(doc)) {
    return; // Already imported
  }

  // Find the position after the last import or at the beginning
  const lines = doc.split("\n");
  let insertPos = 0;
  let lastImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportLine = i;
    } else if (lastImportLine !== -1 && lines[i].trim() !== "") {
      break;
    }
  }

  if (lastImportLine !== -1) {
    // Insert after the last import
    insertPos = lines
      .slice(0, lastImportLine + 1)
      .join("\n").length + 1;
  }

  const newImport = `import { parser as ${language} } from '@lezer/${language}';\n`;

  view.dispatch({
    changes: { from: insertPos, insert: newImport },
  });
}

export function autocomplete() {
  return javascriptLanguage.data.of({
    autocomplete: (context: CompletionContext) => {
      const nodeBefore = syntaxTree(context.state).resolveInner(
        context.pos,
        -1
      );
      if (nodeBefore.name === "String") return;

      const word = context.matchBefore(/\w*/);
      if (!word || (word.from === word.to && !context.explicit)) return null;
      return {
        from: word.from,
        options: Options,
      };
    },
  });
}
