/**
 * Motion Canvas Fiddle - Interactive Scene Editor
 *
 * This demonstrates how to construct Motion Canvas scenes outside the normal build pipeline
 * by dynamically compiling and loading user code with real-time preview capabilities.
 */
import "@catppuccin/palette/css/catppuccin.css";

import { LoadingController } from "./loading";
import { loadCoreModules, type LazyModules } from "./lazy-imports";
import { URLStateManager } from "./url-state";
import type { EditorView } from "@codemirror/view";

let editor: EditorView;
let player: any;
let ui: any;
let splitter: any;
let modules: LazyModules;

async function runAnimation(preserveFrame?: number): Promise<void> {
  ui.hideError();

  try {
    const code = modules.getEditorContent(editor);
    const scene = await modules.compileScene(code);

    await player.updateScene(scene);

    // Restore frame after scene update if one was provided
    if (preserveFrame && preserveFrame > 0) {
      setTimeout(() => {
        if (player.currentDuration > preserveFrame) {
          player.seek(preserveFrame);
          // Ensure the frame stays in the URL after restoration
          URLStateManager.updateFrame(preserveFrame);
        }
      }, 200);
    }
  } catch (error: any) {
    console.error("Animation error:", error);
    ui.showError(error.message);
  }
}

async function init(): Promise<void> {
  const loading = new LoadingController();

  try {
    // Load all modules with progress updates
    modules = await loadCoreModules((progress, message) => {
      loading.updateProgress(progress, message);
    });

    // Create the app structure after modules are loaded
    loading.createAppStructure();

    // Capture initial frame, code, and settings from URL before anything else
    const initialFrame = URLStateManager.getInitialFrame();
    const initialCode = URLStateManager.getInitialCode();
    const initialSettings = URLStateManager.getInitialSettings();

    const editorContainer = document.getElementById("editor");
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;

    if (!editorContainer || !canvas) {
      throw new Error("Required DOM elements not found");
    }

    editor = modules.createEditor(editorContainer, {
      onSave: async () => {
        const currentCode = modules.getEditorContent(editor);
        URLStateManager.updateCode(currentCode);
        await runAnimation(player?.currentFrame);
      },
      initialCode,
    });

    player = new modules.MotionCanvasPlayer(canvas, {
      onError: (message: string) => ui.showError(message),
      onStateChanged: (playing: boolean) => {
        ui.updatePlayState(playing);
        // Save frame to URL when pausing (but only if we have a meaningful frame)
        if (!playing && player.currentFrame > 0) {
          URLStateManager.updateFrame(player.currentFrame);
        }
      },
      onFrameChanged: (frame: number) =>
        ui.updateProgress(frame, player.currentDuration),
      onDurationChanged: (duration: number) =>
        ui.updateProgress(player.currentFrame, duration),
    });

    ui = new modules.UIController({
      onResetCode: () => {
        modules.resetEditorToDefault(editor);
        URLStateManager.clearCode();
      },
      onPlayPause: () => player.togglePlayback(),
      onResetPlayer: () => {
        player.reset();
        URLStateManager.clearFrame();
      },
      onSeek: (frame: number) => {
        player.seek(frame);
        // Only update URL for meaningful frame positions
        if (frame > 0) {
          URLStateManager.updateFrame(frame);
        }
      },
      onProjectSettingsChanged: (settings: any) =>
        player.updateProjectSettings(settings),
      onRunAnimation: async () => {
        const currentCode = modules.getEditorContent(editor);
        URLStateManager.updateCode(currentCode);
        await runAnimation(player?.currentFrame);
      },
    });

    await player.initialize(initialSettings || undefined);
    await ui.initialize();

    // Set player for export functionality
    ui.setPlayer(player);

    // Initialize splitter for both desktop and mobile
    splitter = new modules.SplitterController();

    // Handle window resize to recreate splitter with correct mode
    window.addEventListener("resize", () => {
      if (splitter) {
        splitter.destroy();
      }
      splitter = new modules.SplitterController();
    });

    // Hide loading screen
    await loading.hide();

    // Run initial animation
    await runAnimation(initialFrame);
  } catch (error) {
    console.error("Failed to initialize fiddle:", error);
    loading.updateProgress(
      0,
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
