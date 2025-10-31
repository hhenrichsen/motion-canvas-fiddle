import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

export type ButtonVariant = "default" | "primary" | "danger" | "cancel";
export type ButtonSize = "small" | "medium";

@customElement("base-button")
export class BaseButton extends LitElement {
  @property({ type: String })
  variant: ButtonVariant = "default";

  @property({ type: String })
  size: ButtonSize = "medium";

  @property({ type: Boolean })
  disabled = false;

  static styles = css`
    :host {
      display: inline-block;
    }

    .btn {
      border: 1px solid transparent;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Sizes */
    .btn--small {
      padding: 6px 6px;
      font-size: 13px;
    }

    .btn--medium {
      padding: 8px 8px;
      font-size: 14px;
    }

    /* Variants */
    .btn--default {
      background: var(--ctp-mocha-surface0);
      color: var(--ctp-mocha-text);
      border-color: var(--ctp-mocha-surface2);
    }

    .btn--default:hover:not(:disabled) {
      background: var(--ctp-mocha-surface1);
    }

    .btn--primary {
      background: var(--ctp-mocha-sky);
      color: var(--ctp-mocha-base);
      border-color: var(--ctp-mocha-sky);
    }

    .btn--primary:hover:not(:disabled) {
      opacity: 0.8;
    }

    .btn--danger {
      background: var(--ctp-mocha-red);
      color: var(--ctp-mocha-base);
      border-color: var(--ctp-mocha-red);
    }

    .btn--danger:hover:not(:disabled) {
      opacity: 0.8;
    }

    .btn--cancel {
      background: var(--ctp-mocha-surface1);
      color: var(--ctp-mocha-text);
      border-color: var(--ctp-mocha-surface2);
    }

    .btn--cancel:hover:not(:disabled) {
      background: var(--ctp-mocha-surface2);
    }
  `;

  render() {
    return html`
      <button
        class="btn btn--${this.variant} btn--${this.size}"
        ?disabled=${this.disabled}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  private handleClick = (e: Event): void => {
    if (!this.disabled) {
      e.stopPropagation();
      this.dispatchEvent(
        new CustomEvent("click", {
          detail: e,
          bubbles: true,
          composed: true,
        }),
      );
    }
  };
}
