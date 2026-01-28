import { html, css, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";
import {
  isHTMLSelectElement,
  validateNumberInput,
  validateFloatInput,
} from "../utils/index.js";
import type { ExportProgress } from "../export-controller";

export type ExportFormat = "mp4" | "gif";

@customElement("export-modal")
export class ExportModal extends BaseModal {
  @property({ type: Object })
  progress?: ExportProgress;

  @state()
  private format: ExportFormat = "mp4";

  @state()
  private fps = 30;

  @state()
  private quality = 0.8;

  @state()
  private bitrate = 5000000;

  // GIF-specific settings
  @state()
  private gifFps = 15;

  @state()
  private gifQuality = 10;

  @state()
  private gifScale = 1;

  @state()
  private gifDither: string | false = "FloydSteinberg";

  static styles = [
    BaseModal.styles,
    css`
      .settings-group {
        margin-bottom: 24px;
      }

      .settings-group:last-child {
        margin-bottom: 0;
      }

      label {
        display: block;
        color: var(--ctp-mocha-subtext1);
        font-size: 14px;
        margin-bottom: 8px;
        font-weight: 500;
      }

      select {
        width: 100%;
        padding: 8px 12px;
        background: var(--ctp-mocha-surface1);
        border: 1px solid var(--ctp-mocha-surface2);
        color: var(--ctp-mocha-text);
        font-size: 14px;
        transition: border-color 0.2s;
      }

      select:focus {
        outline: none;
        border-color: var(--ctp-mocha-sky);
      }

      .export-progress {
        background: var(--ctp-mocha-surface1);
        padding: 20px;
        margin-top: 20px;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .progress-phase {
        color: var(--ctp-mocha-sky);
        font-size: 14px;
        font-weight: 500;
      }

      .progress-percentage {
        color: var(--ctp-mocha-subtext1);
        font-size: 14px;
      }

      .progress-bar {
        height: 8px;
        background: var(--ctp-mocha-surface0);
        overflow: hidden;
        margin-bottom: 12px;
      }

      .progress-bar-fill {
        height: 100%;
        background: var(--ctp-mocha-sky);
        transition: width 0.3s ease;
      }

      .progress-message {
        color: var(--ctp-mocha-overlay0);
        font-size: 13px;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.updateTitle();
    this.disabled = !!this.progress;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("progress")) {
      this.disabled = !!this.progress;
    }
    if (changedProperties.has("format")) {
      this.updateTitle();
    }
  }

  private updateTitle(): void {
    this.title = this.format === "mp4" ? "Export MP4" : "Export GIF";
  }

  protected renderBody(): TemplateResult {
    if (!this.progress) {
      return html`
        <div class="settings-group">
          <label for="export-format">Format</label>
          <select id="export-format" @change=${this.handleFormatChange}>
            <option value="mp4" ?selected=${this.format === "mp4"}>
              MP4 (Video)
            </option>
            <option value="gif" ?selected=${this.format === "gif"}>
              GIF (Animated Image)
            </option>
          </select>
        </div>

        ${this.format === "mp4" ? this.renderMP4Settings() : this.renderGIFSettings()}
      `;
    }

    return html`
      <div class="export-progress">
        <div class="progress-header">
          <span class="progress-phase">
            ${this.progress.phase.charAt(0).toUpperCase() +
            this.progress.phase.slice(1)}
          </span>
          <span class="progress-percentage">
            ${Math.round(this.progress.progress)}%
          </span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-bar-fill"
            style="width: ${this.progress.progress}%"
          ></div>
        </div>
        <div class="progress-message">${this.progress.message}</div>
      </div>
    `;
  }

  private renderMP4Settings(): TemplateResult {
    return html`
      <div class="settings-group">
        <label for="export-fps">Frame Rate</label>
        <select id="export-fps" @change=${this.handleFpsChange}>
          <option value="24">24 FPS</option>
          <option value="30" ?selected=${this.fps === 30}>30 FPS</option>
          <option value="60">60 FPS</option>
        </select>
      </div>

      <div class="settings-group">
        <label for="export-quality">Quality</label>
        <select id="export-quality" @change=${this.handleQualityChange}>
          <option value="0.6">Low (60%)</option>
          <option value="0.8" ?selected=${this.quality === 0.8}>
            Medium (80%)
          </option>
          <option value="0.9">High (90%)</option>
          <option value="1">Maximum (100%)</option>
        </select>
      </div>

      <div class="settings-group">
        <label for="export-bitrate">Video Bitrate</label>
        <select id="export-bitrate" @change=${this.handleBitrateChange}>
          <option value="2000000">2 Mbps (Low)</option>
          <option value="5000000" ?selected=${this.bitrate === 5000000}>
            5 Mbps (Medium)
          </option>
          <option value="10000000">10 Mbps (High)</option>
          <option value="20000000">20 Mbps (Ultra)</option>
        </select>
      </div>
    `;
  }

  private renderGIFSettings(): TemplateResult {
    return html`
      <div class="settings-group">
        <label for="gif-resolution">Resolution</label>
        <select id="gif-resolution" @change=${this.handleGifScaleChange}>
          <option value="0.25">25% (Tiny)</option>
          <option value="0.5">50% (Small)</option>
          <option value="0.75">75%</option>
          <option value="1" ?selected=${this.gifScale === 1}>
            100% (Original)
          </option>
          <option value="1.5">150%</option>
          <option value="2">200% (Large)</option>
        </select>
      </div>

      <div class="settings-group">
        <label for="gif-fps">Frame Rate</label>
        <select id="gif-fps" @change=${this.handleGifFpsChange}>
          <option value="10">10 FPS</option>
          <option value="15" ?selected=${this.gifFps === 15}>15 FPS</option>
          <option value="24">24 FPS</option>
          <option value="30">30 FPS</option>
        </select>
      </div>

      <div class="settings-group">
        <label for="gif-quality">Quality</label>
        <select id="gif-quality" @change=${this.handleGifQualityChange}>
          <option value="1">Best (Slow)</option>
          <option value="5">High</option>
          <option value="10" ?selected=${this.gifQuality === 10}>
            Medium (Recommended)
          </option>
          <option value="20">Low (Fast)</option>
        </select>
      </div>

      <div class="settings-group">
        <label for="gif-dither">Dithering</label>
        <select id="gif-dither" @change=${this.handleGifDitherChange}>
          <option value="false">None</option>
          <option
            value="FloydSteinberg"
            ?selected=${this.gifDither === "FloydSteinberg"}
          >
            Floyd-Steinberg (Recommended)
          </option>
          <option value="FloydSteinberg-serpentine">
            Floyd-Steinberg Serpentine
          </option>
          <option value="Stucki">Stucki</option>
          <option value="Atkinson">Atkinson</option>
        </select>
      </div>
    `;
  }

  protected renderFooter(): TemplateResult {
    if (!this.progress) {
      return html`
        <base-button variant="cancel" @click=${this.handleClose}
          >Cancel</base-button
        >
        <base-button variant="primary" @click=${this.handleStart}
          >Start Export</base-button
        >
      `;
    }

    return html`
      <base-button variant="danger" @click=${this.handleCancel}
        >Cancel Export</base-button
      >
    `;
  }

  private handleFormatChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.format = e.target.value as ExportFormat;
    }
  };

  private handleFpsChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.fps = validateNumberInput(e.target.value, 30, 1, 120);
    }
  };

  private handleQualityChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.quality = validateFloatInput(e.target.value, 0.8, 0.1, 1);
    }
  };

  private handleBitrateChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.bitrate = validateNumberInput(
        e.target.value,
        5000000,
        1000000,
        50000000,
      );
    }
  };

  private handleGifFpsChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.gifFps = validateNumberInput(e.target.value, 15, 1, 60);
    }
  };

  private handleGifQualityChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.gifQuality = validateNumberInput(e.target.value, 10, 1, 30);
    }
  };

  private handleGifScaleChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.gifScale = validateFloatInput(e.target.value, 1, 0.25, 2);
    }
  };

  private handleGifDitherChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.gifDither = e.target.value === "false" ? false : e.target.value;
    }
  };

  private handleStart = (): void => {
    if (this.format === "mp4") {
      const settings = {
        format: "mp4" as const,
        fps: this.fps,
        quality: this.quality,
        videoBitrate: this.bitrate,
        videoCodec: "h264",
      };
      this.dispatchEvent(new CustomEvent("start", { detail: settings }));
    } else {
      const settings = {
        format: "gif" as const,
        fps: this.gifFps,
        quality: this.gifQuality,
        scale: this.gifScale,
        dither: this.gifDither,
      };
      this.dispatchEvent(new CustomEvent("start", { detail: settings }));
    }
  };

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent("cancel"));
  };
}
