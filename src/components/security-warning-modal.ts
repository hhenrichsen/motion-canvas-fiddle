import { html, css, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";
import { isHTMLInputElement } from "../utils/index.js";

const STORAGE_KEY = "motion-canvas-fiddle-disable-url-warning";

@customElement("security-warning-modal")
export class SecurityWarningModal extends BaseModal {
  @state()
  private dontShowAgain = false;

  static styles = [
    BaseModal.styles,
    css`
      .warning-icon {
        text-align: center;
        margin-bottom: 20px;
        color: var(--ctp-mocha-yellow);
      }

      .warning-icon svg {
        width: 64px;
        height: 64px;
      }

      .message {
        font-size: 14px;
        line-height: 1.5;
        color: var(--ctp-mocha-subtext0);
        margin-bottom: 16px;
      }

      .message:last-of-type {
        margin-bottom: 24px;
      }

      .message strong {
        color: var(--ctp-mocha-yellow);
        font-weight: 600;
      }

      .checkbox-container {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--ctp-mocha-surface1);
        margin-bottom: 8px;
      }

      .checkbox-container input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--ctp-mocha-sky);
      }

      .checkbox-container label {
        cursor: pointer;
        user-select: none;
        font-size: 13px;
        color: var(--ctp-mocha-subtext1);
        margin: 0;
      }
    `,
  ];

  static isWarningDisabled(): boolean {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  static setWarningDisabled(disabled: boolean): void {
    if (disabled) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.title = "Security Notice";
  }

  private handleCheckboxChange(e: Event): void {
    if (isHTMLInputElement(e.target)) {
      this.dontShowAgain = e.target.checked;
    }
  }

  private handleContinue(): void {
    if (this.dontShowAgain) {
      SecurityWarningModal.setWarningDisabled(true);
    }
    this.dispatchEvent(new CustomEvent("continue"));
    this.handleClose();
  }

  protected renderBody(): TemplateResult {
    return html`
      <div class="warning-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M13 14h-2V9h2m0 9h-2v-2h2M1 21h22L12 2z"
          />
        </svg>
      </div>

      <div class="message">
        <strong>Security Notice:</strong> This page contains code loaded from a
        URL parameter.
      </div>

      <div class="message">
        To protect you from potentially malicious code, automatic execution has
        been disabled. Please review the code in the editor and
        <strong>save it (Ctrl+S or Cmd+S)</strong> to run the animation.
      </div>

      <div class="checkbox-container">
        <input
          type="checkbox"
          id="dont-show-again"
          .checked=${this.dontShowAgain}
          @change=${this.handleCheckboxChange}
        />
        <label for="dont-show-again">
          Don't show this warning again (you can re-enable it in settings)
        </label>
      </div>
    `;
  }

  protected renderFooter(): TemplateResult {
    return html`
      <base-button variant="cancel" @click=${this.handleClose}>
        Close
      </base-button>
      <base-button variant="primary" @click=${this.handleContinue}>
        I Understand
      </base-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "security-warning-modal": SecurityWarningModal;
  }
}
