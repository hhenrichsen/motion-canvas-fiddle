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

@customElement("export-modal")
export class ExportModal extends BaseModal {
  @property({ type: Object })
  progress?: ExportProgress;

  @state()
  private fps = 30;

  @state()
  private quality = 0.8;

  @state()
  private bitrate = 5000000;

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
    this.title = "Export MP4";
    this.disabled = !!this.progress;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("progress")) {
      this.disabled = !!this.progress;
    }
  }

  protected renderBody(): TemplateResult {
    if (!this.progress) {
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

  private handleStart = (): void => {
    const settings = {
      fps: this.fps,
      quality: this.quality,
      videoBitrate: this.bitrate,
      videoCodec: "h264",
    };
    this.dispatchEvent(new CustomEvent("start", { detail: settings }));
  };

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent("cancel"));
  };
}
