import { LitElement, html, css } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { URLStateManager, type ProjectSettings } from "../url-state";
import { ExportController, ExportProgress } from "../export-controller";
import { MotionCanvasPlayer } from "../player";
import "./player-controls";
import "./settings-modal";
import "./export-modal";
import "./help-modal";
import "./templates-modal";
import "./docs-panel";
import "./base-button";
import "./output-console";
import type { OutputConsole } from "./output-console";

export interface AppCallbacks {
  onResetCode: () => void;
  onPlayPause: () => void;
  onResetPlayer: () => void;
  onSeek: (frame: number) => void;
  onProjectSettingsChanged: (settings: ProjectSettings) => Promise<void>;
  onRunAnimation: () => Promise<void>;
  onApplyTemplate: (code: string) => Promise<void>;
}

@customElement("fiddle-app")
export class FiddleApp extends LitElement {
  @property({ type: Object })
  callbacks?: AppCallbacks;

  @property({ type: Object })
  player?: MotionCanvasPlayer;

  @state()
  private isPlaying = false;

  @state()
  private currentFrame = 0;

  @state()
  private duration = 0;

  @state()
  private fps = 30;

  @state()
  private errorMessage = "";

  @state()
  private showSettings = false;

  @state()
  private showExport = false;

  @state()
  private showHelp = false;

  @state()
  private showTemplates = false;

  @state()
  private showDocs = false;

  @state()
  private docsPanelWidth = 400;

  @state()
  private isResizingDocs = false;

  private docsResizeStartX = 0;
  private docsResizeStartWidth = 0;

  @state()
  private exportProgress?: ExportProgress;

  @state()
  private showConsole = false;

  @state()
  private consoleMessageCount = 0;

  @state()
  private formattingEnabled = true;

  @query("#editor")
  editorContainer!: HTMLDivElement;

  @query("#canvas")
  canvas!: HTMLCanvasElement;

  @query("output-console")
  outputConsole?: OutputConsole;

  private exportController?: ExportController;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--ctp-mocha-base);
      color: var(--ctp-mocha-text);
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: var(--ctp-mocha-mantle);
      border-bottom: 1px solid var(--ctp-mocha-surface0);
    }

    .title-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h1 {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
      color: var(--ctp-mocha-text);
    }

    .help-icon-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ctp-mocha-sky);
      transition: opacity 0.2s;
    }

    .help-icon-btn:hover {
      opacity: 0.8;
    }

    .help-icon-btn svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .button-icon {
      display: none;
      width: 18px;
      height: 18px;
      /* Filter to convert black to ctp-mocha-text (#cdd6f4) */
      filter: brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(661%)
        hue-rotate(192deg) brightness(101%) contrast(93%);
    }

    base-button[variant="primary"] .button-icon {
      /* Filter to convert black to ctp-mocha-base (#1e1e2e) */
      filter: brightness(0) saturate(100%) invert(9%) sepia(9%) saturate(1562%)
        hue-rotate(202deg) brightness(97%) contrast(90%);
    }

    .button-text {
      display: inline;
    }

    @media (max-width: 768px) {
      .controls base-button {
        min-width: 40px;
        padding: 4px;
      }

      .button-icon {
        display: inline-block;
      }

      .button-text {
        display: none;
      }
    }

    .split-view {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .editor-panel,
    .preview-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-panel {
      flex: 0 0 50%;
      min-width: 300px;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .editor-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-console-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    .editor-console-wrapper.with-console #editor {
      flex: 0 0 60%;
    }

    .editor-console-wrapper.with-console output-console {
      flex: 0 0 40%;
      min-height: 100px;
    }

    output-console {
      display: none;
    }

    .editor-console-wrapper.with-console output-console {
      display: flex;
    }

    .editor-action-btn {
      background: transparent;
      border: 1px solid var(--ctp-mocha-surface2);
      color: var(--ctp-mocha-text);
      padding: 6px 12px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      box-sizing: border-box;
    }

    .editor-action-btn:hover {
      background: var(--ctp-mocha-surface0);
      border-color: var(--ctp-mocha-sky);
    }

    .editor-action-btn.active {
      background: var(--ctp-mocha-sky);
      color: var(--ctp-mocha-base);
      border-color: var(--ctp-mocha-sky);
    }

    .editor-action-btn img {
      width: 14px;
      height: 14px;
      /* Filter to convert black to ctp-mocha-text (#cdd6f4) */
      filter: brightness(0) saturate(100%) invert(93%) sepia(8%) saturate(661%)
        hue-rotate(192deg) brightness(101%) contrast(93%);
    }

    .editor-action-btn.active img {
      /* Filter to convert black to ctp-mocha-base (#1e1e2e) */
      filter: brightness(0) saturate(100%) invert(9%) sepia(9%) saturate(1562%)
        hue-rotate(202deg) brightness(97%) contrast(90%);
    }

    .console-badge {
      background: var(--ctp-mocha-overlay0);
      color: var(--ctp-mocha-base);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      opacity: 0.5;
      min-width: 20px;
      text-align: center;
    }

    .editor-action-btn.active .console-badge {
      background: var(--ctp-mocha-base);
      color: var(--ctp-mocha-sky);
    }

    .editor-action-btn.icon-only {
      padding: 6px 8px;
      min-width: 32px;
      justify-content: center;
    }

    .preview-panel {
      flex: 1 1 auto;
      min-width: 300px;
      position: relative;
    }

    .docs-panel {
      flex: 0 0 auto;
      min-width: 300px;
      max-width: 800px;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .docs-panel.visible {
      display: flex;
    }

    .docs-splitter {
      width: 4px;
      background: var(--ctp-mocha-surface0);
      cursor: col-resize;
      position: relative;
      flex-shrink: 0;
      transition: background 0.2s;
      display: none;
    }

    .docs-splitter.visible {
      display: block;
    }

    .docs-splitter:hover {
      background: var(--ctp-mocha-surface1);
    }

    .docs-toggle {
      display: none;
    }

    @media (min-width: 1200px) {
      .docs-toggle {
        display: inline-flex;
      }
    }

    .panel-header {
      padding: 12px 16px;
      background: var(--ctp-mocha-mantle);
      border-bottom: 1px solid var(--ctp-mocha-surface0);
      font-size: 14px;
      font-weight: 500;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 56px;
      box-sizing: border-box;
    }

    .run-btn {
      background: var(--ctp-mocha-sky);
      border: 1px solid var(--ctp-mocha-sky);
      color: var(--ctp-mocha-base);
      cursor: pointer;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      transition: opacity 0.2s;
      height: 32px;
      box-sizing: border-box;
    }

    .run-btn:hover {
      opacity: 0.8;
    }

    .run-btn img {
      width: 14px;
      height: 14px;
      /* Filter to convert black to ctp-mocha-base (#1e1e2e) */
      filter: brightness(0) saturate(100%) invert(9%) sepia(9%) saturate(1562%)
        hue-rotate(202deg) brightness(97%) contrast(90%);
    }

    .panel-header.desktop-only {
      display: flex;
    }

    .panel-header.mobile-only {
      display: none;
    }

    #editor {
      flex: 1;
      overflow: auto;
    }

    #editor::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    #editor::-webkit-scrollbar-track {
      background: var(--ctp-mocha-mantle);
    }

    #editor::-webkit-scrollbar-thumb {
      background: var(--ctp-mocha-surface0);
    }

    #editor::-webkit-scrollbar-thumb:hover {
      background: var(--ctp-mocha-surface1);
    }

    #editor::-webkit-scrollbar-corner {
      background: var(--ctp-mocha-mantle);
    }

    /* Firefox scrollbar styling */
    #editor {
      scrollbar-width: thin;
      scrollbar-color: var(--ctp-mocha-surface0) var(--ctp-mocha-mantle);
    }

    #preview {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ctp-mocha-mantle);
      padding: 20px;
    }

    #canvas {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      /* Canvas background is set by Motion Canvas project settings */
    }

    .splitter {
      width: 4px;
      background: var(--ctp-mocha-surface0);
      cursor: col-resize;
      position: relative;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    .splitter:hover {
      background: var(--ctp-mocha-surface1);
    }

    .mobile-splitter {
      display: none;
      height: 8px;
      background: var(--ctp-mocha-surface0);
      cursor: row-resize;
      z-index: 10;
      flex-shrink: 0;
      position: relative;
      align-items: center;
      justify-content: center;
    }

    .mobile-splitter-handle {
      width: 40px;
      height: 4px;
      background: var(--ctp-mocha-surface2);
    }

    .desktop-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ctp-mocha-mantle);
      border: 1px solid var(--ctp-mocha-surface0);
      padding: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 50;
    }

    .mobile-controls {
      display: none;
    }

    .error-message {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ctp-mocha-red);
      color: var(--ctp-mocha-base);
      padding: 12px 20px;
      font-size: 14px;
      max-width: 80%;
      display: none;
      z-index: 100;
    }

    .error-message.show {
      display: block;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    @media (max-width: 768px) {
      .header {
        padding: 12px 16px;
      }

      h1 {
        font-size: 16px;
      }

      .controls {
        gap: 0;
      }

      .split-view {
        flex-direction: column;
      }

      .editor-panel {
        flex: 1;
        width: 100%;
        min-width: unset;
        min-height: 200px;
        order: 3;
      }

      .preview-panel {
        flex: 0 0 30%;
        width: 100%;
        min-width: unset;
        min-height: 150px;
        order: 1;
      }

      #preview {
        padding: 10px;
        height: 100%;
      }

      #canvas {
        width: 300px;
        height: 150px;
        max-width: calc(100vw - 40px);
        max-height: calc(100% - 20px);
      }

      .splitter {
        display: none;
      }

      .mobile-splitter {
        display: flex !important;
        order: 2;
      }

      .panel-header.desktop-only {
        display: none;
      }

      .panel-header.mobile-only {
        display: flex;
      }

      .desktop-controls {
        display: none;
      }

      .mobile-controls {
        display: flex;
      }

      .docs-panel {
        display: none !important;
      }

      .docs-splitter {
        display: none !important;
      }

      .docs-toggle {
        display: none !important;
      }
    }

    .drag-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
      cursor: col-resize;
      display: none;
    }

    .drag-overlay.active {
      display: block;
    }

    @media (max-width: 1199px) {
      .docs-panel {
        display: none !important;
      }

      .docs-splitter {
        display: none !important;
      }

      .docs-toggle {
        display: none !important;
      }
    }
  `;

  render() {
    return html`
      <div class="container">
        <div class="header">
          <div class="title-area">
            <h1>Motion Canvas Fiddle</h1>
            <button
              class="help-icon-btn"
              @click=${this.showHelpModal}
              title="Help"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M13 9h-2V7h2zm0 8h-2v-6h2zM5 3h14a2 2 0 0 1 2 2v14c0 .53-.21 1.04-.59 1.41c-.37.38-.88.59-1.41.59H5c-.53 0-1.04-.21-1.41-.59C3.21 20.04 3 19.53 3 19V5c0-1.11.89-2 2-2m14 16V5H5v14z"
                />
              </svg>
            </button>
          </div>
          <div class="controls">
            <base-button class="docs-toggle" @click=${this.toggleDocs}>
              <img
                class="button-icon"
                src="${import.meta.env.BASE_URL}book-open.svg"
                alt="Docs"
              />
              <span class="button-text">Docs</span>
            </base-button>
            <base-button @click=${this.showTemplatesModal}>
              <img
                class="button-icon"
                src="${import.meta.env.BASE_URL}file-eye.svg"
                alt="Templates"
              />
              <span class="button-text">Templates</span>
            </base-button>
            <base-button @click=${this.handleResetCode}>
              <img
                class="button-icon"
                src="${import.meta.env.BASE_URL}restart.svg"
                alt="Reset"
              />
              <span class="button-text">Reset Code</span>
            </base-button>
            <base-button @click=${this.showSettingsModal}>
              <img
                class="button-icon"
                src="${import.meta.env.BASE_URL}cog.svg"
                alt="Settings"
              />
              <span class="button-text">Settings</span>
            </base-button>
            <base-button variant="primary" @click=${this.showExportModal}>
              <img
                class="button-icon"
                src="${import.meta.env.BASE_URL}video-image.svg"
                alt="Export"
              />
              <span class="button-text">Export MP4</span>
            </base-button>
          </div>
        </div>
        <div class="split-view">
          <div class="editor-panel">
            <div class="panel-header desktop-only">
              <span>Editor</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button
                  class="editor-action-btn ${this.showConsole ? "active" : ""}"
                  @click=${this.toggleConsole}
                  title="Toggle console output"
                >
                  Console
                  ${this.consoleMessageCount > 0
                    ? html`<span class="console-badge"
                        >${this.consoleMessageCount}</span
                      >`
                    : ""}
                </button>
                <button
                  class="editor-action-btn icon-only ${this.formattingEnabled
                    ? "active"
                    : ""}"
                  @click=${this.toggleFormatting}
                  title="Toggle code formatting on save"
                >
                  <img
                    src="${import.meta.env.BASE_URL}broom.svg"
                    alt="Format"
                  />
                </button>
                <button
                  class="run-btn"
                  @click=${this.handleRunAnimation}
                  title="Save and run animation (Ctrl+S)"
                >
                  <img
                    src="${import.meta.env.BASE_URL}save.svg"
                    alt="Save & Run"
                  />
                </button>
              </div>
            </div>
            <div class="panel-header mobile-only">
              <span>Editor</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button
                  class="editor-action-btn ${this.showConsole ? "active" : ""}"
                  @click=${this.toggleConsole}
                  title="Toggle console output"
                >
                  Console
                  ${this.consoleMessageCount > 0
                    ? html`<span class="console-badge"
                        >${this.consoleMessageCount}</span
                      >`
                    : ""}
                </button>
                <button
                  class="editor-action-btn icon-only ${this.formattingEnabled
                    ? "active"
                    : ""}"
                  @click=${this.toggleFormatting}
                  title="Toggle code formatting on save"
                >
                  <img
                    src="${import.meta.env.BASE_URL}broom.svg"
                    alt="Format"
                  />
                </button>
                <button
                  class="run-btn"
                  @click=${this.handleRunAnimation}
                  title="Save and run animation (Ctrl+S)"
                >
                  <img
                    src="${import.meta.env.BASE_URL}save.svg"
                    alt="Save & Run"
                  />
                </button>
              </div>
            </div>
            <div
              class="editor-console-wrapper ${this.showConsole
                ? "with-console"
                : ""}"
            >
              <div id="editor"></div>
              <output-console
                @messagecount=${this.handleMessageCount}
              ></output-console>
            </div>
          </div>
          <div class="splitter" id="splitter"></div>
          <div class="mobile-splitter" id="mobile-splitter">
            <div class="mobile-splitter-handle"></div>
          </div>
          <div class="preview-panel">
            <div class="panel-header desktop-only">
              <span>Preview</span>
            </div>
            <div class="panel-header mobile-only">
              <span>Preview</span>
              <player-controls
                class="mobile-controls"
                ?playing=${this.isPlaying}
                .currentFrame=${this.currentFrame}
                .duration=${this.duration}
                .fps=${this.fps}
                @play-pause=${this.handlePlayPause}
                @reset=${this.handleReset}
                @seek=${this.handleSeek}
              ></player-controls>
            </div>
            <div id="preview">
              <canvas id="canvas"></canvas>
              <player-controls
                class="desktop-controls"
                ?playing=${this.isPlaying}
                .currentFrame=${this.currentFrame}
                .duration=${this.duration}
                .fps=${this.fps}
                @play-pause=${this.handlePlayPause}
                @reset=${this.handleReset}
                @seek=${this.handleSeek}
              ></player-controls>
              <div class="error-message ${this.errorMessage ? "show" : ""}">
                ${this.errorMessage}
              </div>
            </div>
          </div>
          <div
            class="docs-splitter ${this.showDocs ? "visible" : ""}"
            id="docs-splitter"
          ></div>
          <div
            class="docs-panel ${this.showDocs ? "visible" : ""}"
            style="flex-basis: ${this.docsPanelWidth}px"
          >
            <docs-panel @close=${this.hideDocs}></docs-panel>
          </div>
        </div>
      </div>

      ${this.showHelp
        ? html` <help-modal @close=${this.hideHelpModal}></help-modal> `
        : ""}
      ${this.showTemplates
        ? html`
            <templates-modal
              @close=${this.hideTemplatesModal}
              @apply=${this.handleTemplateApply}
            ></templates-modal>
          `
        : ""}
      ${this.showSettings
        ? html`
            <settings-modal
              @close=${this.hideSettingsModal}
              @apply=${this.handleSettingsApply}
            ></settings-modal>
          `
        : ""}
      ${this.showExport
        ? html`
            <export-modal
              .progress=${this.exportProgress}
              @close=${this.hideExportModal}
              @start=${this.handleStartExport}
              @cancel=${this.handleCancelExport}
            ></export-modal>
          `
        : ""}
      <div class="drag-overlay ${this.isResizingDocs ? "active" : ""}"></div>
    `;
  }

  firstUpdated() {
    if (this.player) {
      this.exportController = new ExportController(this.player, {
        onProgress: (progress: ExportProgress) => {
          this.exportProgress = progress;
        },
        onComplete: () => {
          setTimeout(() => {
            this.hideExportModal();
          }, 2000);
        },
        onError: (error: string) => {
          this.showError(`Export failed: ${error}`);
          this.hideExportModal();
        },
      });
    }

    // Load formatting preference from localStorage
    const savedFormattingPref = localStorage.getItem("formattingEnabled");
    if (savedFormattingPref !== null) {
      this.formattingEnabled = savedFormattingPref === "true";
    }

    // Setup keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.callbacks?.onRunAnimation();
      }
    });

    // Setup docs panel resizer
    this.setupDocsPanelResizer();
  }

  private setupDocsPanelResizer() {
    const docsSplitter = this.shadowRoot?.getElementById("docs-splitter");
    if (!docsSplitter) return;

    const onMouseDown = (e: MouseEvent) => {
      this.isResizingDocs = true;
      this.docsResizeStartX = e.clientX;
      this.docsResizeStartWidth = this.docsPanelWidth;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizingDocs) return;

      const deltaX = this.docsResizeStartX - e.clientX;
      const newWidth = Math.max(
        300,
        Math.min(800, this.docsResizeStartWidth + deltaX),
      );
      this.docsPanelWidth = newWidth;
    };

    const onMouseUp = () => {
      if (!this.isResizingDocs) return;
      this.isResizingDocs = false;
    };

    docsSplitter.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  updatePlayState(playing: boolean) {
    this.isPlaying = playing;
  }

  updateProgress(frame: number, duration: number) {
    this.currentFrame = frame;
    this.duration = duration;
    if (this.player) {
      this.fps = this.player.currentFps;
    }
  }

  showError(message: string) {
    this.errorMessage = message;
  }

  hideError() {
    this.errorMessage = "";
  }

  public getConsole(): OutputConsole | undefined {
    return this.outputConsole;
  }

  public updateConsoleMessageCount(count: number): void {
    this.consoleMessageCount = count;
  }

  private toggleConsole = (): void => {
    this.showConsole = !this.showConsole;
  };

  private toggleFormatting = (): void => {
    this.formattingEnabled = !this.formattingEnabled;
    localStorage.setItem("formattingEnabled", String(this.formattingEnabled));
  };

  public isFormattingEnabled(): boolean {
    return this.formattingEnabled;
  }

  private handleMessageCount = (e: CustomEvent<number>): void => {
    this.consoleMessageCount = e.detail;
  };

  private handleResetCode() {
    this.callbacks?.onResetCode();
  }

  private handlePlayPause() {
    this.callbacks?.onPlayPause();
  }

  private handleReset() {
    this.callbacks?.onResetPlayer();
  }

  private handleSeek(e: CustomEvent<number>) {
    this.callbacks?.onSeek(e.detail);
  }

  private handleRunAnimation() {
    this.callbacks?.onRunAnimation();
  }

  private showSettingsModal() {
    this.showSettings = true;
  }

  private hideSettingsModal() {
    this.showSettings = false;
  }

  private showExportModal() {
    this.showExport = true;
    this.exportProgress = undefined;
  }

  private hideExportModal() {
    this.showExport = false;
    this.exportProgress = undefined;
  }

  private async handleSettingsApply(e: CustomEvent<ProjectSettings>) {
    const settings = e.detail;
    URLStateManager.updateSettings(settings);
    await this.callbacks?.onProjectSettingsChanged(settings);
    await this.callbacks?.onRunAnimation();
    this.hideSettingsModal();
  }

  private async handleStartExport(e: CustomEvent) {
    const settings = e.detail;
    if (!this.exportController) {
      this.showError("Export controller not initialized");
      return;
    }

    try {
      await this.exportController.exportMP4(settings);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : String(error));
    }
  }

  private handleCancelExport() {
    this.exportController?.cancelExport();
    this.hideExportModal();
  }

  private showHelpModal() {
    this.showHelp = true;
  }

  private hideHelpModal() {
    this.showHelp = false;
  }

  private showTemplatesModal() {
    this.showTemplates = true;
  }

  private hideTemplatesModal() {
    this.showTemplates = false;
  }

  private async handleTemplateApply(e: CustomEvent<string>) {
    const code = e.detail;
    await this.callbacks?.onApplyTemplate(code);
    this.hideTemplatesModal();
  }

  private toggleDocs() {
    this.showDocs = !this.showDocs;
  }

  private hideDocs() {
    this.showDocs = false;
  }
}
