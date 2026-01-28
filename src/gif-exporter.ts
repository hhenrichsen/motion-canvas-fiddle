import GIF from "gif.js";

export interface GIFExportSettings {
  fps: number;
  quality: number; // 1-30, lower = better quality (pixel sample interval)
  maxColors: number; // 2-256
  scale: number; // 0.25-2, resolution scale factor
  dither: string | false; // Dithering method or false
}

export interface GIFExportCallbacks {
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (error: string) => void;
}

export class GIFExporter {
  private gif: GIF | null = null;
  private isExporting = false;
  private abortController: AbortController | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private frameCount = 0;
  private totalFrames = 0;
  private settings: GIFExportSettings;
  private callbacks: GIFExportCallbacks;
  private scaledWidth = 0;
  private scaledHeight = 0;

  constructor(settings: GIFExportSettings, callbacks: GIFExportCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  async start(
    width: number,
    height: number,
    duration: number,
    sourceFps: number,
  ): Promise<void> {
    if (this.isExporting) {
      throw new Error("Export already in progress");
    }

    this.isExporting = true;
    this.abortController = new AbortController();
    this.frameCount = 0;
    // Duration is in frames at sourceFps, convert to seconds then to frames at export fps
    const durationInSeconds = duration / sourceFps;
    this.totalFrames = Math.ceil(durationInSeconds * this.settings.fps);

    try {
      // Apply scale factor to dimensions
      const scale = this.settings.scale || 1;
      this.scaledWidth = Math.round(width * scale);
      this.scaledHeight = Math.round(height * scale);

      // Create canvas for frame capture at scaled resolution
      this.canvas = document.createElement("canvas");
      this.canvas.width = this.scaledWidth;
      this.canvas.height = this.scaledHeight;
      this.context = this.canvas.getContext("2d", { willReadFrequently: true });

      if (!this.context) {
        throw new Error("Failed to get canvas context");
      }

      // Enable image smoothing for better downscaling quality
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = "high";

      // Create GIF encoder with gif.js
      // Worker path needs to be served from the public folder
      this.gif = new GIF({
        workers: navigator.hardwareConcurrency || 2,
        quality: this.settings.quality,
        width: this.scaledWidth,
        height: this.scaledHeight,
        workerScript: `${import.meta.env.BASE_URL}gif.worker.js`,
        dither: this.settings.dither,
      });

      // Set up event handlers
      this.gif.on("progress", (progress: number) => {
        // Progress during rendering phase (50-95%)
        const renderProgress = 50 + progress * 45;
        this.callbacks.onProgress(renderProgress);
      });

      this.gif.on("finished", (blob: Blob) => {
        this.callbacks.onProgress(100);
        this.callbacks.onComplete(blob);
        this.cleanup();
      });

      this.callbacks.onProgress(0);
    } catch (error) {
      this.isExporting = false;
      this.callbacks.onError(
        `Failed to start GIF export: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async addFrame(sourceCanvas: HTMLCanvasElement): Promise<void> {
    if (!this.isExporting || this.abortController?.signal.aborted) {
      return;
    }

    // Check all required objects are still available (not cleaned up)
    if (!this.context || !this.canvas || !this.gif) {
      return;
    }

    try {
      // Check for abort before processing
      if (this.abortController?.signal.aborted) {
        return;
      }

      // Copy frame from source canvas to export canvas (with scaling)
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(
        sourceCanvas,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      // Calculate frame delay in milliseconds
      const delay = Math.round(1000 / this.settings.fps);

      // Add frame to GIF - use copy: true to capture the current canvas state
      this.gif.addFrame(this.canvas, {
        delay,
        copy: true,
      });

      this.frameCount++;
      // Frame collection phase (0-50%)
      const progress =
        this.totalFrames > 0
          ? (this.frameCount / this.totalFrames) * 50
          : 0;
      this.callbacks.onProgress(Math.min(progress, 50));
    } catch (error) {
      // Don't report errors if we're aborted
      if (!this.abortController?.signal.aborted) {
        this.callbacks.onError(
          `Failed to add frame: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async stop(): Promise<void> {
    if (
      !this.isExporting ||
      !this.gif ||
      this.abortController?.signal.aborted
    ) {
      return;
    }

    try {
      this.callbacks.onProgress(50);

      // Start the rendering process - this triggers the 'finished' event when done
      this.gif.render();
    } catch (error) {
      if (!this.abortController?.signal.aborted) {
        this.callbacks.onError(
          `Failed to finalize GIF export: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.cleanup();
      }
    }
  }

  cancel(): void {
    if (!this.isExporting) {
      return;
    }

    // Signal abort to all operations
    this.abortController?.abort();

    // Abort the GIF rendering if in progress
    if (this.gif) {
      this.gif.abort();
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.isExporting = false;
    this.abortController = null;
    this.gif = null;
    this.canvas = null;
    this.context = null;
    this.frameCount = 0;
    this.totalFrames = 0;
  }

  get exportProgress(): number {
    return this.totalFrames > 0
      ? (this.frameCount / this.totalFrames) * 100
      : 0;
  }

  get signal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }
}
