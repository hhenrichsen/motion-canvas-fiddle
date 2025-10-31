import {
  Player,
  Stage,
  Project,
  ProjectMetadata,
  Logger,
  Vector2,
  ValueDispatcher,
  DefaultPlugin,
  Versions,
} from "@motion-canvas/core";
import { makeScene2D } from "@motion-canvas/2d";
import { URLStateManager } from "./url-state";

export interface PlayerCallbacks {
  onError: (message: string) => void;
  onStateChanged: (isPlaying: boolean) => void;
  onFrameChanged: (frame: number) => void;
  onDurationChanged: (duration: number) => void;
}

export class MotionCanvasPlayer {
  private player: Player | null = null;
  private stage: Stage | null = null;
  private project: Project | null = null;
  private sceneDescription: any = null;
  private canvas: HTMLCanvasElement;
  private callbacks: PlayerCallbacks;
  private isPlaying = false;
  private lastFrame = 0;
  private duration = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: PlayerCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
  }

  async initialize(initialSettings?: {
    fps?: number;
    width?: number;
    height?: number;
    background?: string | null;
  }): Promise<void> {
    if (this.project) return;

    this.sceneDescription = makeScene2D(function* () {
      yield;
    });

    // Scene replacement mechanism enables live reloading without recreating the entire player
    this.sceneDescription.onReplaced = new ValueDispatcher(
      this.sceneDescription,
    );
    this.sceneDescription.onReplaced.current = this.sceneDescription;

    const logger = new Logger();
    const versions: Versions = {
      core: "3.17.2",
      two: "3.17.2",
      ui: "3.17.2",
      vitePlugin: "3.17.2",
    };

    this.project = {
      name: "fiddle",
      logger,
      plugins: [DefaultPlugin()],
      scenes: [this.sceneDescription],
      experimentalFeatures: true,
      versions,
      meta: null as any, // Will be set below
      settings: {} as any,
    };

    this.project.meta = new ProjectMetadata(this.project);
    this.project.meta.shared.size.set([
      initialSettings?.width || 1920,
      initialSettings?.height || 1080,
    ]);
    this.project.meta.shared.background.set(
      initialSettings?.background || null,
    );

    const fps = initialSettings?.fps || 30;
    this.project.meta.preview.fps.set(fps);

    this.player = new Player(this.project, {
      size: this.project.meta.shared.size.get(),
      fps: fps, // Pass FPS to Player so it uses the same value for calculations
    });

    // Expose player globally so user scenes can access playback controls if needed
    (window as any).player = this.player;

    this.stage = new Stage();
    this.stage.configure({
      size: this.project.meta.shared.size.get(),
    });

    this.setupEventListeners();
    await this.waitForInitialCalculation();
  }

  private setupEventListeners(): void {
    if (!this.player || !this.project) return;

    this.player.onRender.subscribe(async () => {
      await this.render();
    });

    this.project.logger.onLogged.subscribe((payload: any) => {
      if (payload.level === "error") {
        console.error("Motion Canvas error:", payload.message);
        this.callbacks.onError(`Runtime error: ${payload.message}`);
      }
    });

    this.player.onStateChanged.subscribe((state) => {
      this.isPlaying = !state.paused;
      this.callbacks.onStateChanged(this.isPlaying);
    });

    this.player.onFrameChanged.subscribe((frame) => {
      this.lastFrame = frame;
      this.callbacks.onFrameChanged(frame);
    });

    this.player.onDurationChanged.subscribe((duration) => {
      this.duration = duration;
      this.callbacks.onDurationChanged(duration);
    });
  }

  private async render(): Promise<void> {
    if (!this.stage || !this.player) return;

    try {
      await this.stage.render(
        this.player.playback.currentScene,
        this.player.playback.previousScene,
      );

      if (this.stage.finalBuffer) {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
          this.canvas.width = this.stage.finalBuffer.width;
          this.canvas.height = this.stage.finalBuffer.height;
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          ctx.drawImage(this.stage.finalBuffer, 0, 0);
        }
      }
    } catch (error: any) {
      this.callbacks.onError(`Render error: ${error.message}`);
    }
  }

  private async waitForInitialCalculation(): Promise<void> {
    if (!this.player) return;

    return new Promise<void>((resolve) => {
      const unsubscribe = this.player!.onRecalculated.subscribe(() => {
        unsubscribe();
        this.player!.requestRender();
        resolve();
      });
    });
  }

  async updateScene(newScene: any): Promise<void> {
    if (!this.sceneDescription || !this.project || !this.player) {
      throw new Error("Player not initialized");
    }

    const wasPlaying = this.isPlaying;
    const currentFrame = this.lastFrame;

    const updatedDescription = {
      ...this.sceneDescription.onReplaced.current,
      ...newScene,
      size: this.project.meta.shared.size.get(),
    };

    this.sceneDescription.onReplaced.current = updatedDescription;
    this.player.requestReset();

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Restore playback position to maintain user context during live reloads
    if (currentFrame > 5 && this.duration > 0) {
      this.player.requestSeek(currentFrame);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.player.togglePlayback(wasPlaying);
    this.player.requestRender();
  }

  togglePlayback(): void {
    if (this.player) {
      this.player.togglePlayback();
    }
  }

  reset(): void {
    if (this.player) {
      this.player.requestReset();
      this.player.togglePlayback(false);
    }
  }

  seek(frame: number): void {
    if (this.player) {
      this.player.requestSeek(frame);
    }
  }

  async updateProjectSettings(settings: {
    width?: number;
    height?: number;
    fps?: number;
    background?: string | null;
  }): Promise<void> {
    if (!this.project || !this.stage) return;

    if (settings.width && settings.height) {
      const size = new Vector2(settings.width, settings.height);
      this.project.meta.shared.size.set(size);
      this.stage.configure({ size });

      // Scene will be recompiled with new size on next update

      // Update canvas size to match the new resolution
      this.canvas.width = settings.width;
      this.canvas.height = settings.height;

      // Update canvas CSS to maintain the exact aspect ratio
      const aspectRatio = settings.width / settings.height;
      this.canvas.style.width = "auto";
      this.canvas.style.height = "auto";
      this.canvas.style.maxWidth = "100%";
      this.canvas.style.maxHeight = "100%";
      this.canvas.style.aspectRatio = aspectRatio.toString();
    }

    if (settings.fps && settings.fps !== this.project.meta.preview.fps.get()) {
      const currentFrame = this.lastFrame;

      this.project.meta.preview.fps.set(settings.fps);

      // Update the Player's internal FPS to match
      // This is critical - Player uses its own FPS for all calculations
      if (this.player && this.project) {
        await this.player.configure({
          fps: settings.fps,
          size: this.project.meta.shared.size.get(),
          range: [0, Infinity],
          audioOffset: 0,
          resolutionScale: 1,
        } as any);

        // The configure method already handles frame recalculation and repositioning
        this.player.requestRender();

        // Update URL frame to maintain the same time position
        // Only update if we had a meaningful frame position
        if (currentFrame > 0) {
          // Get the new frame position after FPS change
          // The player.configure() method should have already adjusted the frame
          const newFrame = this.player.playback.frame;
          if (newFrame > 0) {
            URLStateManager.updateFrame(newFrame);
          }
        }
      }
    }

    if (settings.background !== undefined) {
      this.project.meta.shared.background.set(settings.background);

      // Also apply background directly to canvas for immediate visual feedback
      if (settings.background) {
        this.canvas.style.backgroundColor = settings.background;
      } else {
        // Use default dark background when cleared
        this.canvas.style.backgroundColor = "#1a1a1a";
      }

      // Force a re-render to apply the background change
      if (this.player && !this.isPlaying) {
        await this.render();
      }
    }

    // Force a re-render for any settings change when not playing
    if (this.player && !this.isPlaying) {
      await this.render();
    }
  }

  get currentFrame(): number {
    return this.lastFrame;
  }

  get currentDuration(): number {
    return this.duration;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  get currentFps(): number {
    if (!this.project) return 30;
    return this.project.meta.preview.fps.get();
  }
}
