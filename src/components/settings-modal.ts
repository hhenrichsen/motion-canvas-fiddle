import { html, css, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";
import { URLStateManager, type ProjectSettings } from "../url-state";
import {
  isHTMLInputElement,
  isHTMLSelectElement,
  validateNumberInput,
} from "../utils/index.js";

@customElement("settings-modal")
export class SettingsModal extends BaseModal {
  @state()
  private width = 1920;

  @state()
  private height = 1080;

  @state()
  private fps = 30;

  @state()
  private background = "#1a1a1a";

  static styles = [
    BaseModal.styles,
    css`
      label {
        display: block;
        color: #999;
        font-size: 14px;
        margin-bottom: 8px;
        font-weight: 500;
      }

      input[type="number"],
      input[type="color"],
      select {
        width: 100%;
        padding: 8px 12px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      input[type="number"]:focus,
      input[type="color"]:focus,
      select:focus {
        outline: none;
        border-color: #3b82f6;
      }

      .settings-group {
        margin-bottom: 24px;
      }

      .settings-group:last-child {
        margin-bottom: 0;
      }

      .input-group {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .input-group input {
        flex: 1;
      }

      .input-group span {
        color: #666;
        font-size: 16px;
      }

      .color-group {
        display: flex;
        gap: 8px;
      }

      .color-group input[type="color"] {
        flex: 1;
        height: 38px;
        cursor: pointer;
      }

      .clear-btn {
        padding: 8px 16px;
        background: #333;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }

      .clear-btn:hover {
        background: #444;
      }
    `
  ];

  connectedCallback() {
    super.connectedCallback();
    this.title = 'Project Settings';

    const settings = URLStateManager.getInitialSettings();
    if (settings) {
      this.width = settings.width || 1920;
      this.height = settings.height || 1080;
      this.fps = settings.fps || 30;
      this.background = settings.background || '#1a1a1a';
    }
  }

  protected renderBody(): TemplateResult {
    return html`
      <div class="settings-group">
        <label>Canvas Resolution</label>
        <div class="input-group">
          <input
            type="number"
            id="width-input"
            .value=${this.width.toString()}
            @input=${this.handleWidthChange}
            placeholder="1920"
            min="1"
            max="7680"
          />
          <span>×</span>
          <input
            type="number"
            id="height-input"
            .value=${this.height.toString()}
            @input=${this.handleHeightChange}
            placeholder="1080"
            min="1"
            max="4320"
          />
        </div>
      </div>

      <div class="settings-group">
        <label for="fps-select">Frame Rate (FPS)</label>
        <select
          id="fps-select"
          .value=${this.fps.toString()}
          @change=${this.handleFpsChange}
        >
          <option value="24">24 FPS</option>
          <option value="25">25 FPS</option>
          <option value="30">30 FPS</option>
          <option value="50">50 FPS</option>
          <option value="60">60 FPS</option>
          <option value="120">120 FPS</option>
        </select>
      </div>

      <div class="settings-group">
        <label>Background Color</label>
        <div class="color-group">
          <input
            type="color"
            id="bg-input"
            .value=${this.background}
            @input=${this.handleBackgroundChange}
          />
          <button class="clear-btn" @click=${this.clearBackground}>
            Clear
          </button>
        </div>
      </div>
    `;
  }

  protected renderFooter(): TemplateResult {
    return html`
      <base-button variant="cancel" @click=${this.handleClose}
        >Cancel</base-button
      >
      <base-button variant="primary" @click=${this.handleApply}
        >Apply</base-button
      >
    `;
  }

  private handleWidthChange = (e: Event): void => {
    if (isHTMLInputElement(e.target)) {
      this.width = validateNumberInput(e.target.value, 1920, 1, 7680);
    }
  };

  private handleHeightChange = (e: Event): void => {
    if (isHTMLInputElement(e.target)) {
      this.height = validateNumberInput(e.target.value, 1080, 1, 4320);
    }
  };

  private handleFpsChange = (e: Event): void => {
    if (isHTMLSelectElement(e.target)) {
      this.fps = validateNumberInput(e.target.value, 30, 1, 120);
    }
  };

  private handleBackgroundChange = (e: Event): void => {
    if (isHTMLInputElement(e.target)) {
      this.background = e.target.value;
    }
  };

  private clearBackground = (): void => {
    this.background = "#1a1a1a";
  };

  private handleApply = (): void => {
    const settings: ProjectSettings = {
      width: this.width,
      height: this.height,
      fps: this.fps,
      background: this.background === "#1a1a1a" ? null : this.background,
    };
    this.dispatchEvent(new CustomEvent("apply", { detail: settings }));
  };
}
