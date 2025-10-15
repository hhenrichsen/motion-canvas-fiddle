import { URLStateManager, type ProjectSettings } from "./url-state";
import { ExportController, ExportProgress } from "./export-controller";
import { MotionCanvasPlayer } from "./player";

export interface UICallbacks {
  onResetCode: () => void;
  onPlayPause: () => void;
  onResetPlayer: () => void;
  onSeek: (frame: number) => void;
  onProjectSettingsChanged: (settings: ProjectSettings) => Promise<void>;
  onRunAnimation: () => Promise<void>;
}

export class UIController {
  private callbacks: UICallbacks;
  private currentDuration = 0;
  private currentFps = 30;
  private exportController: ExportController | null = null;
  private player: MotionCanvasPlayer | null = null;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
  }

  setPlayer(player: MotionCanvasPlayer): void {
    this.player = player;
    this.currentFps = player.currentFps;
    this.exportController = new ExportController(player, {
      onProgress: (progress: ExportProgress) =>
        this.updateExportProgress(progress),
      onComplete: () => this.onExportComplete(),
      onError: (error: string) => this.onExportError(error),
    });
  }

  async initialize(): Promise<void> {
    this.setupButtonHandlers();
    this.setupProgressBar();
    this.setupProjectControls();
    this.setupSettingsModal();
    this.setupExportModal();
    await this.loadInitialSettings();
    this.setupKeyboardShortcuts();
  }

  private setupButtonHandlers(): void {
    const resetBtn = document.getElementById("reset-btn");
    const exportBtn = document.getElementById("export-btn");

    // Desktop controls
    const playBtn = document.getElementById("play-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const resetPlayerBtn = document.getElementById("reset-player-btn");

    // Mobile controls
    const playBtnMobile = document.querySelector(".play-btn-mobile");
    const pauseBtnMobile = document.querySelector(".pause-btn-mobile");
    const resetPlayerBtnMobile = document.querySelector(
      ".reset-player-btn-mobile"
    );

    resetBtn?.addEventListener("click", this.callbacks.onResetCode);
    exportBtn?.addEventListener("click", () => this.showExportModal());

    // Desktop handlers
    playBtn?.addEventListener("click", this.callbacks.onPlayPause);
    pauseBtn?.addEventListener("click", this.callbacks.onPlayPause);
    resetPlayerBtn?.addEventListener("click", this.callbacks.onResetPlayer);

    // Mobile handlers
    playBtnMobile?.addEventListener("click", this.callbacks.onPlayPause);
    pauseBtnMobile?.addEventListener("click", this.callbacks.onPlayPause);
    resetPlayerBtnMobile?.addEventListener(
      "click",
      this.callbacks.onResetPlayer
    );
  }

  private setupProgressBar(): void {
    // Setup desktop progress bar
    const progressBar = document.getElementById("progress");
    if (progressBar) {
      this.setupProgressBarEvents(progressBar);
    }

    // Setup mobile progress bar
    const progressBarMobile = document.querySelector(".progress-mobile");
    if (progressBarMobile) {
      this.setupProgressBarEvents(progressBarMobile as HTMLElement);
    }
  }

  private setupProgressBarEvents(progressBar: HTMLElement): void {
    let isDragging = false;

    const handleSeek = (event: MouseEvent) => {
      if (this.currentDuration <= 0) return;

      const rect = progressBar.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const targetFrame = Math.floor(percentage * this.currentDuration);

      this.callbacks.onSeek(targetFrame);
    };

    progressBar.addEventListener("mousedown", (e) => {
      isDragging = true;
      handleSeek(e);
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        handleSeek(e);
        e.preventDefault();
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    progressBar.addEventListener("click", handleSeek);
    progressBar.style.cursor = "pointer";
  }

  private setupProjectControls(): void {
    const widthInput = document.getElementById(
      "canvas-width"
    ) as HTMLInputElement;
    const heightInput = document.getElementById(
      "canvas-height"
    ) as HTMLInputElement;
    const fpsSelect = document.getElementById("fps") as HTMLSelectElement;
    const backgroundInput = document.getElementById(
      "background-color"
    ) as HTMLInputElement;
    const clearBgBtn = document.getElementById("clear-bg");

    const updateSettings = () => {
      const settings: any = {};

      if (widthInput?.value)
        settings.width = parseInt(widthInput.value) || 1920;
      if (heightInput?.value)
        settings.height = parseInt(heightInput.value) || 1080;
      if (fpsSelect?.value) {
        settings.fps = parseInt(fpsSelect.value) || 30;
        // Update the current FPS for time calculations
        this.currentFps = settings.fps;
      }

      if (backgroundInput?.value) {
        const bgColor = backgroundInput.value;
        settings.background = bgColor && bgColor !== "#1a1a1a" ? bgColor : null;
      }

      this.callbacks.onProjectSettingsChanged(settings);
    };

    widthInput?.addEventListener("change", updateSettings);
    heightInput?.addEventListener("change", updateSettings);
    fpsSelect?.addEventListener("change", updateSettings);
    backgroundInput?.addEventListener("change", updateSettings);

    clearBgBtn?.addEventListener("click", () => {
      if (backgroundInput) {
        backgroundInput.value = "#1a1a1a";
        updateSettings();
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.callbacks.onRunAnimation();
      }
    });
  }

  updatePlayState(playing: boolean): void {

    // Desktop controls
    const playBtn = document.getElementById("play-btn");
    const pauseBtn = document.getElementById("pause-btn");

    // Mobile controls
    const playBtnMobile = document.querySelector(
      ".play-btn-mobile"
    ) as HTMLElement;
    const pauseBtnMobile = document.querySelector(
      ".pause-btn-mobile"
    ) as HTMLElement;

    // Update desktop controls
    if (playBtn && pauseBtn) {
      if (playing) {
        playBtn.style.display = "none";
        pauseBtn.style.display = "flex";
      } else {
        playBtn.style.display = "flex";
        pauseBtn.style.display = "none";
      }
    }

    // Update mobile controls
    if (playBtnMobile && pauseBtnMobile) {
      if (playing) {
        playBtnMobile.style.display = "none";
        pauseBtnMobile.style.display = "flex";
      } else {
        playBtnMobile.style.display = "flex";
        pauseBtnMobile.style.display = "none";
      }
    }
  }

  updateProgress(frame: number, duration: number): void {
    this.currentDuration = duration;

    // Desktop progress elements
    const progressFill = document.getElementById("progress-fill");
    const timeElement = document.getElementById("time");

    // Mobile progress elements
    const progressFillMobile = document.querySelector(
      ".progress-fill-mobile"
    ) as HTMLElement;
    const timeElementMobile = document.querySelector(
      ".time-mobile"
    ) as HTMLElement;

    const progress = duration > 0 ? (frame / duration) * 100 : 0;
    const progressWidth = `${Math.min(100, Math.max(0, progress))}%`;

    // Update desktop progress
    if (progressFill) {
      progressFill.style.width = progressWidth;
    }

    // Update mobile progress
    if (progressFillMobile) {
      progressFillMobile.style.width = progressWidth;
    }

    if (duration > 0) {
      // Use the player's current FPS for time calculations
      // This ensures we match Motion Canvas's internal calculations
      if (this.player) {
        this.currentFps = this.player.currentFps;
      }

      const currentTime = this.formatTime(frame / this.currentFps);
      const totalTime = this.formatTime(duration / this.currentFps);
      const timeText = `${currentTime} / ${totalTime}`;

      // Update desktop time
      if (timeElement) {
        timeElement.textContent = timeText;
      }

      // Update mobile time
      if (timeElementMobile) {
        timeElementMobile.textContent = timeText;
      }
    }
  }

  showError(message: string): void {
    const errorElement = document.getElementById("error");
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add("show");
    }
  }

  hideError(): void {
    const errorElement = document.getElementById("error");
    if (errorElement) {
      errorElement.classList.remove("show");
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  private setupSettingsModal(): void {
    const settingsBtn = document.getElementById("settings-btn");
    const settingsModal = document.getElementById("settings-modal");
    const closeSettingsBtn = document.getElementById("close-settings");
    const applySettingsBtn = document.getElementById("apply-settings");
    const clearBgBtn = document.getElementById("clear-bg");
    const backgroundInput = document.getElementById(
      "background-color"
    ) as HTMLInputElement;

    // Show modal
    settingsBtn?.addEventListener("click", () => {
      if (settingsModal) {
        settingsModal.style.display = "flex";
      }
    });

    // Hide modal
    const hideModal = () => {
      if (settingsModal) {
        settingsModal.style.display = "none";
      }
    };

    closeSettingsBtn?.addEventListener("click", hideModal);

    // Close on backdrop click
    settingsModal?.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        hideModal();
      }
    });

    // Apply settings
    applySettingsBtn?.addEventListener("click", async () => {
      await this.applyProjectSettings();
      hideModal();
    });

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && settingsModal?.style.display === "flex") {
        hideModal();
      }
    });

    // Clear background button
    clearBgBtn?.addEventListener("click", () => {
      if (backgroundInput) {
        backgroundInput.value = "#1a1a1a";
      }
    });
  }

  private async loadInitialSettings(): Promise<void> {
    const settings = URLStateManager.getInitialSettings();
    if (settings) {
      this.populateSettingsForm(settings);
      await this.callbacks.onProjectSettingsChanged(settings);
    }
  }

  private populateSettingsForm(settings: ProjectSettings): void {
    const widthInput = document.getElementById(
      "canvas-width"
    ) as HTMLInputElement;
    const heightInput = document.getElementById(
      "canvas-height"
    ) as HTMLInputElement;
    const fpsSelect = document.getElementById("fps") as HTMLSelectElement;
    const backgroundInput = document.getElementById(
      "background-color"
    ) as HTMLInputElement;

    if (settings.width && widthInput) {
      widthInput.value = settings.width.toString();
    }
    if (settings.height && heightInput) {
      heightInput.value = settings.height.toString();
    }
    if (settings.fps && fpsSelect) {
      fpsSelect.value = settings.fps.toString();
      // Update the current FPS for time calculations
      this.currentFps = settings.fps;
    }
    if (settings.background && backgroundInput) {
      backgroundInput.value = settings.background;
    }
  }

  private async applyProjectSettings(): Promise<void> {
    const widthInput = document.getElementById(
      "canvas-width"
    ) as HTMLInputElement;
    const heightInput = document.getElementById(
      "canvas-height"
    ) as HTMLInputElement;
    const fpsSelect = document.getElementById("fps") as HTMLSelectElement;
    const backgroundInput = document.getElementById(
      "background-color"
    ) as HTMLInputElement;

    const settings: ProjectSettings = {};

    if (widthInput?.value) {
      settings.width = parseInt(widthInput.value) || 1920;
    }
    if (heightInput?.value) {
      settings.height = parseInt(heightInput.value) || 1080;
    }
    if (fpsSelect?.value) {
      settings.fps = parseInt(fpsSelect.value) || 30;
      // Update the current FPS for time calculations
      this.currentFps = settings.fps;
    }
    if (backgroundInput?.value) {
      const bgColor = backgroundInput.value;
      // Only set to null if it's the exact default color, otherwise use the selected color
      settings.background = bgColor === "#1a1a1a" ? null : bgColor;
    }

    // Save to URL
    URLStateManager.updateSettings(settings);

    // Apply to player
    await this.callbacks.onProjectSettingsChanged(settings);

    // Trigger a recompilation to recreate the scene with new settings
    await this.callbacks.onRunAnimation();
  }

  private setupExportModal(): void {
    const exportModal = document.getElementById("export-modal");
    const closeExportBtn = document.getElementById("close-export");
    const startExportBtn = document.getElementById("start-export");
    const cancelExportBtn = document.getElementById("cancel-export");

    // Close modal
    const hideExportModal = () => {
      if (exportModal) {
        exportModal.style.display = "none";
        this.resetExportModal();
      }
    };

    closeExportBtn?.addEventListener("click", hideExportModal);

    // Close on backdrop click
    exportModal?.addEventListener("click", (e) => {
      if (e.target === exportModal) {
        hideExportModal();
      }
    });

    // Start export
    startExportBtn?.addEventListener("click", () => this.startExport());

    // Cancel export
    cancelExportBtn?.addEventListener("click", () => this.cancelExport());

    // Escape key to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && exportModal?.style.display === "flex") {
        hideExportModal();
      }
    });
  }

  private showExportModal(): void {
    const exportModal = document.getElementById("export-modal");
    if (exportModal) {
      exportModal.style.display = "flex";
    }
  }

  private resetExportModal(): void {
    const progressDiv = document.getElementById("export-progress");
    const startBtn = document.getElementById("start-export");
    const cancelBtn = document.getElementById("cancel-export");

    if (progressDiv) progressDiv.style.display = "none";
    if (startBtn) startBtn.style.display = "block";
    if (cancelBtn) cancelBtn.style.display = "none";
  }

  private async startExport(): Promise<void> {
    if (!this.exportController) {
      this.showError("Export controller not initialized");
      return;
    }

    // Get export settings
    const fpsSelect = document.getElementById(
      "export-fps"
    ) as HTMLSelectElement;
    const qualitySelect = document.getElementById(
      "export-quality"
    ) as HTMLSelectElement;
    const bitrateSelect = document.getElementById(
      "export-bitrate"
    ) as HTMLSelectElement;

    const settings = {
      fps: parseInt(fpsSelect?.value || "30"),
      quality: parseFloat(qualitySelect?.value || "0.8"),
      videoBitrate: parseInt(bitrateSelect?.value || "5000000"),
      videoCodec: "h264",
    };

    // Show progress UI
    const progressDiv = document.getElementById("export-progress");
    const startBtn = document.getElementById("start-export");
    const cancelBtn = document.getElementById("cancel-export");

    if (progressDiv) progressDiv.style.display = "block";
    if (startBtn) startBtn.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "block";

    try {
      await this.exportController.exportMP4(settings);
    } catch (error) {
      this.onExportError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private cancelExport(): void {
    if (this.exportController) {
      this.exportController.cancelExport();
    }
    this.resetExportModal();
  }

  private updateExportProgress(progress: ExportProgress): void {
    const phaseElement = document.getElementById("export-phase");
    const percentageElement = document.getElementById("export-percentage");
    const progressFill = document.getElementById("export-progress-fill");
    const messageElement = document.getElementById("export-message");

    if (phaseElement)
      phaseElement.textContent =
        progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1);
    if (percentageElement)
      percentageElement.textContent = `${Math.round(progress.progress)}%`;
    if (progressFill) progressFill.style.width = `${progress.progress}%`;
    if (messageElement) messageElement.textContent = progress.message;
  }

  private onExportComplete(): void {
    setTimeout(() => {
      const exportModal = document.getElementById("export-modal");
      if (exportModal) {
        exportModal.style.display = "none";
      }
      this.resetExportModal();
    }, 2000);
  }

  private onExportError(error: string): void {
    this.showError(`Export failed: ${error}`);
    this.resetExportModal();
  }
}
