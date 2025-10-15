export interface ExportSettings {
  quality: number;
  fps: number;
  videoBitrate: number;
  videoCodec: string;
}

export interface ExportCallbacks {
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (error: string) => void;
}

export class MP4Exporter {
  private output: any = null;
  private canvasSource: any = null;
  private isExporting = false;
  private abortController: AbortController | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private frameCount = 0;
  private totalFrames = 0;
  private settings: ExportSettings;
  private callbacks: ExportCallbacks;
  private mediaBunny: any = null;

  constructor(settings: ExportSettings, callbacks: ExportCallbacks) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  async start(
    width: number,
    height: number,
    duration: number,
    sourceFps: number
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
      // Dynamically import MediaBunny
      this.mediaBunny = await import("mediabunny");
      const { Output, BufferTarget, CanvasSource, Mp4OutputFormat } =
        this.mediaBunny;

      // Create canvas for frame capture
      this.canvas = document.createElement("canvas");
      this.canvas.width = width;
      this.canvas.height = height;
      this.context = this.canvas.getContext("2d");

      if (!this.context) {
        throw new Error("Failed to get canvas context");
      }

      // Create MediaBunny components
      const target = new BufferTarget();
      const format = new Mp4OutputFormat();

      // Create output with correct format
      this.output = new Output({
        format: format,
        target: target,
      });

      // Create canvas source
      this.canvasSource = new CanvasSource(this.canvas, {
        codec: "avc", // Use standard codec name
        bitrate: this.settings.videoBitrate,
      });

      // Add video track with frame rate
      this.output.addVideoTrack(this.canvasSource, {
        frameRate: this.settings.fps,
      });

      // Start the export
      await this.output.start();

      this.callbacks.onProgress(0);
    } catch (error) {
      this.isExporting = false;
      this.callbacks.onError(
        `Failed to start export: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async addFrame(sourceCanvas: HTMLCanvasElement): Promise<void> {
    if (!this.isExporting || this.abortController?.signal.aborted) {
      return;
    }

    // Check all required objects are still available (not cleaned up)
    if (!this.context || !this.canvas || !this.canvasSource || !this.output) {
      return;
    }

    try {
      // Check for abort before processing
      if (this.abortController?.signal.aborted) {
        return;
      }

      // Copy frame from source canvas to export canvas
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.drawImage(
        sourceCanvas,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      // Calculate timestamp and duration for this frame
      const timestampInSeconds = this.frameCount / this.settings.fps;
      const durationInSeconds = 1 / this.settings.fps;

      // Add frame to MediaBunny with timestamp and duration
      this.canvasSource.add(timestampInSeconds, durationInSeconds);

      this.frameCount++;
      const progress =
        this.totalFrames > 0 ? (this.frameCount / this.totalFrames) * 100 : 0;
      this.callbacks.onProgress(Math.min(progress, 95)); // Cap at 95% until finalization
    } catch (error) {
      // Don't report errors if we're aborted
      if (!this.abortController?.signal.aborted) {
        this.callbacks.onError(
          `Failed to add frame: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  async stop(): Promise<void> {
    if (
      !this.isExporting ||
      !this.output ||
      this.abortController?.signal.aborted
    ) {
      return;
    }

    try {
      this.callbacks.onProgress(95);

      // Finalize the export
      await this.output.finalize();

      // Get the buffer from the target
      const videoFile = this.output.target.buffer;
      const blob = new Blob([videoFile], { type: "video/mp4" });

      this.callbacks.onProgress(100);
      this.callbacks.onComplete(blob);
    } catch (error) {
      if (!this.abortController?.signal.aborted) {
        this.callbacks.onError(
          `Failed to finalize export: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } finally {
      this.cleanup();
    }
  }

  cancel(): void {
    if (!this.isExporting) {
      return;
    }

    // Signal abort to all operations
    this.abortController?.abort();

    // Cleanup will happen in the next addFrame or stop call
    this.cleanup();
  }

  private cleanup(): void {
    this.isExporting = false;
    this.abortController = null;
    this.output = null;
    this.canvasSource = null;
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

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
