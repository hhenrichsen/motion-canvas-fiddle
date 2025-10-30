import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'cancel';
export type ButtonSize = 'small' | 'medium';

@customElement('base-button')
export class BaseButton extends LitElement {
  @property({ type: String })
  variant: ButtonVariant = 'default';

  @property({ type: String })
  size: ButtonSize = 'medium';

  @property({ type: Boolean })
  disabled = false;

  static styles = css`
    :host {
      display: inline-block;
    }

    .btn {
      border: none;
      border-radius: 6px;
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
      padding: 6px 12px;
      font-size: 13px;
    }

    .btn--medium {
      padding: 8px 16px;
      font-size: 14px;
    }

    /* Variants */
    .btn--default {
      background: var(--ctp-mocha-surface0);
      color: var(--ctp-mocha-text);
    }

    .btn--default:hover:not(:disabled) {
      background: var(--ctp-mocha-surface1);
    }

    .btn--primary {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #fff;
    }

    .btn--primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn--danger {
      background: #ef4444;
      color: #fff;
    }

    .btn--danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn--cancel {
      background: #333;
      color: #fff;
    }

    .btn--cancel:hover:not(:disabled) {
      background: #444;
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
      this.dispatchEvent(new CustomEvent('click', {
        detail: e,
        bubbles: true,
        composed: true
      }));
    }
  };
}