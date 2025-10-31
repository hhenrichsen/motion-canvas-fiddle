/**
 * Motion Canvas Fiddle - Interactive Scene Editor
 *
 * This demonstrates how to construct Motion Canvas scenes outside the normal build pipeline
 * by dynamically compiling and loading user code with real-time preview capabilities.
 */
import "@catppuccin/palette/css/catppuccin.css";

import { loadCoreModules, type LazyModules } from "./lazy-imports";
import { URLStateManager } from "./url-state";
import type { EditorView } from "@codemirror/view";
import "./components/loading-overlay";
import "./components/fiddle-app";
import "./components/security-warning-modal";
import type { LoadingOverlay } from "./components/loading-overlay";
import type { FiddleApp } from "./components/fiddle-app";
import { SecurityWarningModal } from "./components/security-warning-modal";
import { fetchFromGist, fetchFromUrl } from "./code-loader";
import { schedulePrefetch } from "./prefetch";
import "./register-service-worker"; // Auto-registers service worker

let editor: EditorView;
let player: any;
let app: FiddleApp;
let splitter: any;
let modules: LazyModules;

async function runAnimation(preserveFrame?: number): Promise<void> {
  app.hideError();

  try {
    const code = modules.getEditorContent(editor);

    // Get compilation mode from settings
    const compilationMode = localStorage.getItem("compilationMode") || "auto";
    const forceWebContainer = compilationMode === "webcontainer";
    const forceBabel = compilationMode === "babel";

    // Create logger that writes to the console component
    const outputConsole = app.getConsole();
    const logger = outputConsole
      ? {
          log: (msg: string) => outputConsole.log(msg),
          error: (msg: string) => outputConsole.error(msg),
          warn: (msg: string) => outputConsole.warn(msg),
          info: (msg: string) => outputConsole.info(msg),
        }
      : undefined;

    // Log compilation start
    outputConsole?.info("Starting compilation...");

    // Show compilation progress
    const scene = await modules.compileScene(code, {
      forceWebContainer,
      forceBabel,
      logger,
      loadMotionCanvasGraphing: modules.loadMotionCanvasGraphing,
      loadThree: modules.loadThree,
      loadShiki: modules.loadShiki,
      loadShikiHighlighter: modules.loadShikiHighlighter,
      loadLezer: modules.loadLezer,
      onProgress: (progress) => {
        console.log(
          `[${progress.stage}] ${progress.message} (${progress.progress}%)`
        );
        outputConsole?.info(`${progress.message} (${progress.progress}%)`);
      },
    });

    // Log successful compilation
    outputConsole?.info("✓ Scene compiled successfully");

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
  } catch (error: unknown) {
    console.error("Animation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error to console pane
    const outputConsole = app.getConsole();
    if (outputConsole) {
      outputConsole.error(`Compilation failed: ${errorMessage}`);
    }

    app.showError(errorMessage);
  }
}

async function init(): Promise<void> {
  // Create and add loading overlay
  const loading = document.createElement("loading-overlay") as LoadingOverlay;
  document.body.appendChild(loading);

  try {
    // Load all modules with progress updates
    modules = await loadCoreModules((progress, message) => {
      loading.updateProgress(progress, message);
    });

    // Create and add the main app component
    app = document.createElement("fiddle-app") as FiddleApp;
    document.body.appendChild(app);

    // Wait for app to be ready
    await app.updateComplete;

    // Capture initial frame, code, and settings from URL before anything else
    const initialFrame = URLStateManager.getInitialFrame();
    let initialCode = URLStateManager.getInitialCode();
    const initialSettings = URLStateManager.getInitialSettings();

    // Check for Gist or source URL parameters
    const gistId = URLStateManager.getInitialGist();
    const srcUrl = URLStateManager.getInitialSrc();

    // Fetch code from external sources if provided
    // Priority: gist > src > code
    if (gistId && !initialCode) {
      try {
        loading.updateProgress(90, "Loading code from Gist...");
        initialCode = await fetchFromGist(gistId);
        // Clear gist parameter and replace with code parameter
        URLStateManager.clearGist();
        URLStateManager.updateCode(initialCode);
      } catch (error) {
        console.error("Failed to load Gist:", error);
        app.showError(
          `Failed to load Gist: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else if (srcUrl && !initialCode) {
      try {
        loading.updateProgress(90, "Loading code from URL...");
        initialCode = await fetchFromUrl(srcUrl);
        // Clear src parameter and replace with code parameter
        URLStateManager.clearSrc();
        URLStateManager.updateCode(initialCode);
      } catch (error) {
        console.error("Failed to load from URL:", error);
        app.showError(
          `Failed to load from URL: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Wait for DOM elements to be available
    if (!app.editorContainer || !app.canvas) {
      throw new Error("Required DOM elements not found");
    }

    const editorContainer = app.editorContainer;
    const canvas = app.canvas;

    editor = modules.createEditor(editorContainer, {
      onSave: async () => {
        // Format the code and update the editor (if formatting is enabled)
        const formattedCode = await modules.formatAndUpdateEditor(
          editor,
          app.isFormattingEnabled(),
        );

        // Only save to URL if code is not the default
        if (formattedCode === modules.DEFAULT_CODE) {
          URLStateManager.clearCode();
        } else {
          URLStateManager.updateCode(formattedCode);
        }
        await runAnimation(player?.currentFrame);
      },
      initialCode,
    });

    player = new modules.MotionCanvasPlayer(canvas, {
      onError: (message: string) => app.showError(message),
      onStateChanged: (playing: boolean) => {
        app.updatePlayState(playing);
        // Save frame to URL when pausing (but only if we have a meaningful frame)
        if (!playing && player.currentFrame > 0) {
          URLStateManager.updateFrame(player.currentFrame);
        }
      },
      onFrameChanged: (frame: number) =>
        app.updateProgress(frame, player.currentDuration),
      onDurationChanged: (duration: number) =>
        app.updateProgress(player.currentFrame, duration),
    });

    // Set callbacks for the app
    app.callbacks = {
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
        // Format the code and update the editor (if formatting is enabled)
        const formattedCode = await modules.formatAndUpdateEditor(
          editor,
          app.isFormattingEnabled(),
        );

        // Only save to URL if code is not the default
        if (formattedCode === modules.DEFAULT_CODE) {
          URLStateManager.clearCode();
        } else {
          URLStateManager.updateCode(formattedCode);
        }
        await runAnimation(player?.currentFrame);
      },
    };

    // Ensure we have default settings for first load
    const defaultSettings = {
      width: 1920,
      height: 1080,
      fps: 30,
      background: "#1a1a1a",
    };

    const settings = initialSettings
      ? { ...defaultSettings, ...initialSettings }
      : defaultSettings;
    await player.initialize(settings);

    // Explicitly apply project settings to ensure canvas background is set
    await player.updateProjectSettings(settings);

    // Set player for export functionality
    app.player = player;

    // Initialize splitter for both desktop and mobile
    // Wait for next frame to ensure DOM is rendered
    await new Promise((resolve) => requestAnimationFrame(resolve));
    splitter = new modules.SplitterController(app.shadowRoot);

    // Handle window resize to update splitter mode
    window.addEventListener("resize", () => {
      if (splitter) {
        // Small delay to allow layout to settle
        setTimeout(() => {
          splitter.updateForResize();
        }, 100);
      }
    });

    // Hide loading screen
    await loading.hide();

    // Preload Prettier in the background for formatting
    modules.preloadFormatter();

    // Schedule prefetch of common library chunks during idle time for offline support
    schedulePrefetch(modules);

    // Check if code came from URL and if we should show security warning
    const codeFromURL = initialCode !== null || gistId !== null || srcUrl !== null;
    const shouldShowWarning =
      codeFromURL && !SecurityWarningModal.isWarningDisabled();

    if (shouldShowWarning) {
      // Show security warning and don't run animation until user saves
      const warningModal = document.createElement(
        "security-warning-modal"
      ) as SecurityWarningModal;
      document.body.appendChild(warningModal);

      // Listen for user acknowledgment but don't auto-run
      const removeModal = () => {
        if (document.body.contains(warningModal)) {
          document.body.removeChild(warningModal);
        }
      };

      warningModal.addEventListener("continue", removeModal);
      warningModal.addEventListener("close", removeModal);
    } else {
      // Run initial animation only if code didn't come from URL or user has disabled warnings
      await runAnimation(initialFrame);
    }
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
