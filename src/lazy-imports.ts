import type { EditorView } from "@codemirror/view";
import type { EditorOptions } from "./editor";
import type { MotionCanvasPlayer } from "./player";
import type { UIController } from "./ui";
import type { SplitterController } from "./splitter";

export interface LazyModules {
  createEditor: (container: HTMLElement, options: EditorOptions) => EditorView;
  resetEditorToDefault: (editor: EditorView) => void;
  getEditorContent: (editor: EditorView) => string;
  DEFAULT_CODE: string;
  compileScene: (code: string) => Promise<any>;
  MotionCanvasPlayer: typeof MotionCanvasPlayer;
  UIController: typeof UIController;
  SplitterController: typeof SplitterController;
  MotionCanvasCore: any;
  MotionCanvas2D: any;
  loadCanvasCommons: () => Promise<any>;
}

let cachedModules: LazyModules | null = null;
let canvasCommonsModule: any = null;

async function loadCanvasCommons(): Promise<any> {
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
      "Failed to load @hhenrichsen/canvas-commons. Make sure it's installed."
    );
  }
}

export async function loadCoreModules(
  updateProgress: (progress: number, message: string) => void
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
    DEFAULT_CODE: editorModule.DEFAULT_CODE,
    compileScene: (code: string) =>
      compilerModule.compileScene(code, loadCanvasCommons),
    MotionCanvasPlayer: playerModule.MotionCanvasPlayer,
    UIController: uiModule.UIController,
    SplitterController: splitterModule.SplitterController,
    MotionCanvasCore,
    MotionCanvas2D,
    loadCanvasCommons,
  };

  updateProgress(95, "Setting up global modules...");

  // Set up global modules for user code access
  (window as any).CanvasCore = MotionCanvasCore;
  (window as any).Canvas2D = {
    ...MotionCanvas2D,
    jsx: MotionCanvas2D.jsx || ((type: any, props: any) => ({ type, props })),
    jsxs: MotionCanvas2D.jsxs || ((type: any, props: any) => ({ type, props })),
    Fragment: MotionCanvas2D.Fragment || "div",
  };

  updateProgress(100, "Ready!");

  return cachedModules;
}
