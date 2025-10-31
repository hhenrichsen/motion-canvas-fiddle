import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("docs-panel")
export class DocsPanel extends LitElement {
  @property({ type: String })
  url = "https://motioncanvas.io/docs/";

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--ctp-mocha-base);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: var(--ctp-mocha-mantle);
      border-bottom: 1px solid var(--ctp-mocha-surface0);
      font-size: 14px;
      font-weight: 500;
      color: var(--ctp-mocha-text);
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--ctp-mocha-subtext0);
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: var(--ctp-mocha-text);
    }

    .iframe-container {
      flex: 1;
      position: relative;
      overflow: hidden;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
  `;

  private handleClose(): void {
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="panel-header">
        <span>Motion Canvas Docs</span>
        <button
          class="close-btn"
          @click=${this.handleClose}
          title="Close docs panel"
        >
          ×
        </button>
      </div>
      <div class="iframe-container">
        <iframe
          src=${this.url}
          title="Motion Canvas Documentation"
          loading="lazy"
          referrerpolicy="no-referrer"
          credentialless
          allow="cross-origin-isolated"
        ></iframe>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "docs-panel": DocsPanel;
  }
}
