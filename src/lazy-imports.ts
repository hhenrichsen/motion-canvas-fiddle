import type { EditorView } from "@codemirror/view";
import type { EditorOptions } from "./editor";
import type { MotionCanvasPlayer } from "./player";
import type { UIController } from "./ui";
import type { SplitterController } from "./splitter";
import type { CompileOptions } from "./compiler";

export interface LazyModules {
  createEditor: (container: HTMLElement, options: EditorOptions) => EditorView;
  resetEditorToDefault: (editor: EditorView) => void;
  getEditorContent: (editor: EditorView) => string;
  formatAndUpdateEditor: (
    editor: EditorView,
    shouldFormat?: boolean,
  ) => Promise<string>;
  preloadFormatter: () => void;
  DEFAULT_CODE: string;
  compileScene: (code: string, options?: CompileOptions) => Promise<unknown>;
  MotionCanvasPlayer: typeof MotionCanvasPlayer;
  UIController: typeof UIController;
  SplitterController: typeof SplitterController;
  MotionCanvasCore: unknown;
  MotionCanvas2D: unknown;
  loadCanvasCommons: () => Promise<unknown>;
  loadMotionCanvasGraphing: () => Promise<unknown>;
  loadThree: () => Promise<unknown>;
  loadShiki: () => Promise<unknown>;
  loadShikiHighlighter: () => Promise<unknown>;
  loadLezer: () => Promise<unknown>;
}

let cachedModules: LazyModules | null = null;
let canvasCommonsModule: unknown = null;
let motionCanvasGraphingModule: unknown = null;
let threeModule: unknown = null;
let shikiModule: unknown = null;
let shikiHighlighterModule: unknown = null;
let lezerModule: unknown = null;

async function loadCanvasCommons(): Promise<unknown> {
  if (canvasCommonsModule) {
    return canvasCommonsModule;
  }

  try {
    canvasCommonsModule = await import("@hhenrichsen/canvas-commons");

    // Set up global module for user code access
    (window as any).CanvasCommons = canvasCommonsModule;

    return canvasCommonsModule;
  } catch (error) {
    console.error("Failed to load canvas-commons:", error);
    throw new Error(
      "Failed to load @hhenrichsen/canvas-commons. Make sure it's installed.",
    );
  }
}

async function loadMotionCanvasGraphing(): Promise<unknown> {
  if (motionCanvasGraphingModule) {
    return motionCanvasGraphingModule;
  }

  try {
    motionCanvasGraphingModule = await import(
      "@spidunno/motion-canvas-graphing"
    );

    // Set up global module for user code access
    (window as any).MotionCanvasGraphing = motionCanvasGraphingModule;

    return motionCanvasGraphingModule;
  } catch (error) {
    console.error("Failed to load motion-canvas-graphing:", error);
    throw new Error(
      "Failed to load @spidunno/motion-canvas-graphing. Make sure it's installed.",
    );
  }
}

async function loadThree(): Promise<unknown> {
  if (threeModule) {
    return threeModule;
  }

  try {
    threeModule = await import("three");

    // Set up global module for user code access
    (window as any).THREE = threeModule;

    return threeModule;
  } catch (error) {
    console.error("Failed to load three.js:", error);
    throw new Error("Failed to load three.js. Make sure it's installed.");
  }
}

async function loadShiki(): Promise<unknown> {
  if (shikiModule) {
    return shikiModule;
  }

  try {
    shikiModule = await import("shiki");

    // Set up global module for user code access
    (window as any).Shiki = shikiModule;

    return shikiModule;
  } catch (error) {
    console.error("Failed to load shiki:", error);
    throw new Error("Failed to load shiki. Make sure it's installed.");
  }
}

async function loadShikiHighlighter(): Promise<unknown> {
  if (shikiHighlighterModule) {
    return shikiHighlighterModule;
  }

  try {
    shikiHighlighterModule = await import("./shiki");

    // Set up global module for user code access
    (window as any).ShikiHighlighter = (
      shikiHighlighterModule as any
    ).ShikiHighlighter;

    return shikiHighlighterModule;
  } catch (error) {
    console.error("Failed to load ShikiHighlighter:", error);
    throw new Error("Failed to load ShikiHighlighter from ./shiki.");
  }
}

async function loadLezer(): Promise<unknown> {
  if (lezerModule) {
    return lezerModule;
  }

  try {
    // Load all lezer packages dynamically
    const [
      lezerCommon,
      lezerHighlight,
      lezerLr,
      lezerCpp,
      lezerCss,
      lezerGo,
      lezerHtml,
      lezerJava,
      lezerJavascript,
      lezerJson,
      lezerMarkdown,
      lezerPhp,
      lezerPython,
      lezerRust,
      lezerSass,
      lezerXml,
      lezerYaml,
    ] = await Promise.all([
      import("@lezer/common"),
      import("@lezer/highlight"),
      import("@lezer/lr"),
      import("@lezer/cpp"),
      import("@lezer/css"),
      import("@lezer/go"),
      import("@lezer/html"),
      import("@lezer/java"),
      import("@lezer/javascript"),
      import("@lezer/json"),
      import("@lezer/markdown"),
      import("@lezer/php"),
      import("@lezer/python"),
      import("@lezer/rust"),
      import("@lezer/sass"),
      import("@lezer/xml"),
      import("@lezer/yaml"),
    ]);

    lezerModule = {
      common: lezerCommon,
      highlight: lezerHighlight,
      lr: lezerLr,
      cpp: lezerCpp,
      css: lezerCss,
      go: lezerGo,
      html: lezerHtml,
      java: lezerJava,
      javascript: lezerJavascript,
      json: lezerJson,
      markdown: lezerMarkdown,
      php: lezerPhp,
      python: lezerPython,
      rust: lezerRust,
      sass: lezerSass,
      xml: lezerXml,
      yaml: lezerYaml,
    };

    // Set up global modules for user code access
    (window as any).Lezer = lezerModule;
    (window as any).LezerCommon = lezerCommon;
    (window as any).LezerHighlight = lezerHighlight;
    (window as any).LezerLR = lezerLr;
    (window as any).LezerCpp = lezerCpp;
    (window as any).LezerCss = lezerCss;
    (window as any).LezerGo = lezerGo;
    (window as any).LezerHtml = lezerHtml;
    (window as any).LezerJava = lezerJava;
    (window as any).LezerJavascript = lezerJavascript;
    (window as any).LezerJson = lezerJson;
    (window as any).LezerMarkdown = lezerMarkdown;
    (window as any).LezerPhp = lezerPhp;
    (window as any).LezerPython = lezerPython;
    (window as any).LezerRust = lezerRust;
    (window as any).LezerSass = lezerSass;
    (window as any).LezerXml = lezerXml;
    (window as any).LezerYaml = lezerYaml;

    return lezerModule;
  } catch (error) {
    console.error("Failed to load lezer:", error);
    throw new Error("Failed to load lezer. Make sure it's installed.");
  }
}

export async function loadCoreModules(
  updateProgress: (progress: number, message: string) => void,
): Promise<LazyModules> {
  if (cachedModules) {
    return cachedModules;
  }

  updateProgress(10, "Loading Motion Canvas Core...");
  const [MotionCanvasCore] = await Promise.all([import("@motion-canvas/core")]);

  updateProgress(25, "Loading Motion Canvas 2D...");
  const [MotionCanvas2D] = await Promise.all([import("@motion-canvas/2d")]);

  updateProgress(40, "Loading CodeMirror Editor...");
  const [editorModule] = await Promise.all([import("./editor")]);

  updateProgress(55, "Loading Scene Compiler...");
  const [compilerModule] = await Promise.all([import("./compiler")]);

  updateProgress(70, "Loading Player Components...");
  const [playerModule, uiModule, splitterModule] = await Promise.all([
    import("./player"),
    import("./ui"),
    import("./splitter"),
  ]);

  updateProgress(85, "Initializing components...");

  cachedModules = {
    createEditor: editorModule.createEditor,
    resetEditorToDefault: editorModule.resetEditorToDefault,
    getEditorContent: editorModule.getEditorContent,
    formatAndUpdateEditor: (editor: EditorView, shouldFormat?: boolean) =>
      editorModule.formatAndUpdateEditor(editor, shouldFormat),
    preloadFormatter: editorModule.preloadFormatter,
    DEFAULT_CODE: editorModule.DEFAULT_CODE,
    compileScene: (code: string, options?: CompileOptions) =>
      compilerModule.compileScene(code, {
        ...options,
        loadCanvasCommons: options?.loadCanvasCommons || loadCanvasCommons,
      }),
    MotionCanvasPlayer: playerModule.MotionCanvasPlayer,
    UIController: uiModule.UIController,
    SplitterController: splitterModule.SplitterController,
    MotionCanvasCore,
    MotionCanvas2D,
    loadCanvasCommons,
    loadMotionCanvasGraphing,
    loadThree,
    loadShiki,
    loadShikiHighlighter,
    loadLezer,
  };

  updateProgress(95, "Setting up global modules...");

  // Import JSX runtime for proper JSX handling
  const jsxRuntime = await import("@motion-canvas/2d/lib/jsx-runtime");

  // Set up global modules for user code access
  (window as any).CanvasCore = MotionCanvasCore;
  (window as any).Canvas2D = {
    ...MotionCanvas2D,
    jsx: jsxRuntime.jsx,
    jsxs: jsxRuntime.jsxs,
    Fragment: jsxRuntime.Fragment,
  };

  updateProgress(100, "Ready!");

  return cachedModules;
}
