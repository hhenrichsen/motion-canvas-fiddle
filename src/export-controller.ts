import { MP4Exporter, ExportSettings, downloadBlob } from "./mp4-exporter";
import { MotionCanvasPlayer } from "./player";

export interface ExportProgress {
  phase: "preparing" | "exporting" | "finalizing" | "complete";
  progress: number;
  message: string;
}

export interface ExportControllerCallbacks {
  onProgress: (progress: ExportProgress) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export class ExportController {
  private player: MotionCanvasPlayer;
  private callbacks: ExportControllerCallbacks;
  private isExporting = false;
  private exporter: MP4Exporter | null = null;

  constructor(
    player: MotionCanvasPlayer,
    callbacks: ExportControllerCallbacks
  ) {
    this.player = player;
    this.callbacks = callbacks;
  }

  async exportMP4(settings?: Partial<ExportSettings>): Promise<void> {
    if (this.isExporting) {
      throw new Error("Export already in progress");
    }

    const defaultSettings: ExportSettings = {
      quality: 0.8,
      fps: 30,
      videoBitrate: 5000000,
      videoCodec: "h264",
    };

    const exportSettings = { ...defaultSettings, ...settings };

    this.isExporting = true;

    try {
      this.callbacks.onProgress({
        phase: "preparing",
        progress: 0,
        message: "Preparing export...",
      });

      const duration = this.player.currentDuration;
      const sourceFps = this.player.currentFps;
      const canvas = document.getElementById("canvas") as HTMLCanvasElement;

      if (!canvas) {
        throw new Error("Canvas not found");
      }

      if (duration <= 0) {
        throw new Error("No animation to export");
      }

      this.exporter = new MP4Exporter(exportSettings, {
        onProgress: (progress) => {
          const durationInSeconds = duration / sourceFps;
          const totalExportFrames = Math.ceil(
            durationInSeconds * exportSettings.fps
          );
          const currentFrame = Math.floor((progress * totalExportFrames) / 100);

          this.callbacks.onProgress({
            phase: progress < 95 ? "exporting" : "finalizing",
            progress,
            message:
              progress < 95
                ? `Exporting frame ${currentFrame}/${totalExportFrames}...`
                : "Finalizing video...",
          });
        },
        onComplete: (blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `canvas-commons-animation-${timestamp}.mp4`;
          downloadBlob(blob, filename);

          this.callbacks.onProgress({
            phase: "complete",
            progress: 100,
            message: "Export complete!",
          });

          setTimeout(() => {
            this.callbacks.onComplete();
          }, 1000);
        },
        onError: (error) => {
          this.callbacks.onError(error);
        },
      });

      await this.exporter.start(
        canvas.width,
        canvas.height,
        duration,
        sourceFps
      );

      const wasPlaying = this.player.playing;
      const originalFrame = this.player.currentFrame;

      this.player.reset();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const durationInSeconds = duration / sourceFps;
      const totalExportFrames = Math.ceil(
        durationInSeconds * exportSettings.fps
      );
      const frameStep = duration / totalExportFrames;

      for (let i = 0; i < totalExportFrames; i++) {
        if (!this.exporter || this.exporter.signal?.aborted) {
          break;
        }

        const sourceFrame = Math.round(i * frameStep);

        this.player.seek(sourceFrame);
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (this.exporter && !this.exporter.signal?.aborted) {
          await this.exporter.addFrame(canvas);
        }
      }

      if (this.exporter && !this.exporter.signal?.aborted) {
        await this.exporter.stop();
      }

      this.player.seek(originalFrame);
      if (wasPlaying) {
        this.player.togglePlayback();
      }
    } catch (error) {
      this.callbacks.onError(
        `Export failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      this.cleanup();
    }
  }

  cancelExport(): void {
    if (this.exporter) {
      this.exporter.cancel();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.isExporting = false;
    this.exporter = null;
  }

  get isExportInProgress(): boolean {
    return this.isExporting;
  }
}
