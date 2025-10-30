import { LitElement, html, css, type CSSResultGroup, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';

export abstract class BaseModal extends LitElement {
  @property({ type: String })
  title = '';

  @property({ type: Boolean })
  disabled = false;

  static styles: CSSResultGroup = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .modal-content {
      background: #2a2a2a;
      border-radius: 12px;
      padding: 0;
      width: 500px;
      max-width: 90%;
      max-height: 90vh;
      overflow: auto;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .close-btn {
      background: none;
      border: none;
      color: #999;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.2s, color 0.2s;
    }

    .close-btn:hover {
      background: #333;
      color: #fff;
    }

    .close-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-footer {
      padding: 20px 24px;
      border-top: 1px solid #333;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    @media (max-width: 600px) {
      .modal-content {
        width: 95%;
        border-radius: 8px;
      }

      .modal-header {
        padding: 16px 20px;
      }

      .modal-body {
        padding: 20px;
      }

      .modal-footer {
        padding: 16px 20px;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !this.disabled) {
      this.handleClose();
    }
  };

  private handleBackdropClick = (e: Event): void => {
    if (e.target === this && !this.disabled) {
      this.handleClose();
    }
  };

  protected handleClose(): void {
    this.dispatchEvent(new CustomEvent('close'));
  }

  protected abstract renderBody(): TemplateResult;
  protected abstract renderFooter(): TemplateResult;

  render() {
    return html`
      <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <h3>${this.title}</h3>
          <button class="close-btn" @click=${this.handleClose} ?disabled=${this.disabled}>
            &times;
          </button>
        </div>
        <div class="modal-body">
          ${this.renderBody()}
        </div>
        <div class="modal-footer">
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.addEventListener('click', this.handleBackdropClick);
  }
}