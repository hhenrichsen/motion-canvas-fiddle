import { html, css, type TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";
import { BaseModal } from "./base-modal.js";
import "./base-button.js";

@customElement("help-modal")
export class HelpModal extends BaseModal {
  static styles = [
    BaseModal.styles,
    css`
      .help-section {
        margin-bottom: 24px;
      }

      .help-section:last-of-type {
        margin-bottom: 0;
      }

      .help-section h4 {
        color: var(--ctp-mocha-sky);
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .help-section h4 svg {
        width: 20px;
        height: 20px;
      }

      .help-content {
        font-size: 14px;
        line-height: 1.6;
        color: var(--ctp-mocha-subtext0);
      }

      .param-list,
      .package-list {
        list-style: none;
        padding: 0;
        margin: 8px 0 0 0;
      }

      .param-item,
      .package-item {
        padding: 10px;
        margin-bottom: 8px;
        background: var(--ctp-mocha-surface0);
        border-left: 3px solid var(--ctp-mocha-sky);
      }

      .param-item:last-child,
      .package-item:last-child {
        margin-bottom: 0;
      }

      .param-name,
      .package-name {
        font-family: "Courier New", monospace;
        font-weight: 600;
        color: var(--ctp-mocha-sky);
        font-size: 13px;
      }

      .param-description,
      .package-description {
        margin-top: 4px;
        font-size: 13px;
        color: var(--ctp-mocha-subtext1);
      }

      .example {
        margin-top: 8px;
        padding: 8px;
        background: var(--ctp-mocha-mantle);
        border-radius: 4px;
        font-family: "Courier New", monospace;
        font-size: 12px;
        color: var(--ctp-mocha-text);
        overflow-x: auto;
        word-break: break-all;
      }

      /* Scrollbar styling */
      :host ::-webkit-scrollbar {
        width: 8px;
      }

      :host ::-webkit-scrollbar-track {
        background: var(--ctp-mocha-mantle);
      }

      :host ::-webkit-scrollbar-thumb {
        background: var(--ctp-mocha-surface0);
        border-radius: 4px;
      }

      :host ::-webkit-scrollbar-thumb:hover {
        background: var(--ctp-mocha-surface1);
      }

      /* Firefox scrollbar */
      :host {
        scrollbar-width: thin;
        scrollbar-color: var(--ctp-mocha-surface0) var(--ctp-mocha-mantle);
      }

      @media (max-width: 768px) {
        .help-section h4 {
          font-size: 15px;
        }

        .param-name,
        .package-name {
          font-size: 12px;
        }

        .param-description,
        .package-description {
          font-size: 12px;
        }
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.title = "Help & Documentation";
  }

  protected renderBody(): TemplateResult {
    return html`
      <div class="help-section">
        <h4>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10 19h3v3h-3zm2-17c5.35.22 7.68 5.62 4.5 9.67c-.83 1-2.17 1.66-2.83 2.5C13 15 13 16 13 17h-3c0-1.67 0-3.08.67-4.08c.66-1 2-1.59 2.83-2.25C15.92 8.43 15.32 5.26 12 5a3 3 0 0 0-3 3H6a6 6 0 0 1 6-6"
            />
          </svg>
          Query Parameters
        </h4>
        <div class="help-content">
          <p>Share your fiddle by adding these parameters to the URL:</p>
          <ul class="param-list">
            <li class="param-item">
              <div class="param-name">?c=...</div>
              <div class="param-description">
                Compressed code content (auto-saved when you press Ctrl+S or
                Cmd+S)
              </div>
              <div class="example">?c=N4IgbghgJgzgdg...</div>
            </li>
            <li class="param-item">
              <div class="param-name">?f=...</div>
              <div class="param-description">
                Frame number (current playback position)
              </div>
              <div class="example">?f=120</div>
            </li>
            <li class="param-item">
              <div class="param-name">?s=...</div>
              <div class="param-description">
                Compressed project settings (width, height, fps, background)
              </div>
              <div class="example">?s=N4IgZglgNgpgzi...</div>
            </li>
            <li class="param-item">
              <div class="param-name">?g=...</div>
              <div class="param-description">
                GitHub Gist ID to load code from
              </div>
              <div class="example">?g=abc123def456</div>
            </li>
            <li class="param-item">
              <div class="param-name">?src=...</div>
              <div class="param-description">
                External URL to load code from (raw .ts or .js file)
              </div>
              <div class="example">?src=https://example.com/scene.ts</div>
            </li>
          </ul>
        </div>
      </div>

      <div class="help-section">
        <h4>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 2c-.2 0-.4.1-.6.2L3.5 6.6c-.3.2-.5.5-.5.9v9c0 .4.2.7.5.9l7.9 4.4c.2.1.4.2.6.2s.4-.1.6-.2l.9-.5c-.3-.6-.4-1.3-.5-2v-6.7l6-3.4V13c.7 0 1.4.1 2 .3V7.5c0-.4-.2-.7-.5-.9l-7.9-4.4c-.2-.1-.4-.2-.6-.2m0 2.2l6 3.3l-2 1.1l-5.9-3.4zM8.1 6.3L14 9.8l-2 1.1l-6-3.4zM5 9.2l6 3.4v6.7l-6-3.4zm16.3 6.6l-3.6 3.6l-1.6-1.6L15 19l2.8 3l4.8-4.8z"
            />
          </svg>
          Available Packages
        </h4>
        <div class="help-content">
          <p>
            These packages are pre-loaded and available for import in your code:
          </p>
          <ul class="package-list">
            <li class="package-item">
              <div class="package-name">@motion-canvas/core</div>
              <div class="package-description">
                Core animation engine and utilities
              </div>
            </li>
            <li class="package-item">
              <div class="package-name">@motion-canvas/2d</div>
              <div class="package-description">
                2D rendering components (Circle, Rect, Text, etc.)
              </div>
            </li>
            <li class="package-item">
              <div class="package-name">@hhenrichsen/canvas-commons</div>
              <div class="package-description">Hunter's component library</div>
            </li>
            <li class="package-item">
              <div class="package-name">@spidunno/motion-canvas-graphing</div>
              <div class="package-description">
                Spidunno's graphing components
              </div>
            </li>
            <li class="package-item">
              <div class="package-name">./shiki</div>
              <div class="package-description">
                Special import for Skeary's
                <code>ShikiHighlighter</code>
              </div>
            </li>
            <li class="package-item">
              <div class="package-name">shiki</div>
              <div class="package-description">
                Alternate syntax highlighter
              </div>
            </li>
            <li class="package-item">
              <div class="package-name">lezer</div>
              <div class="package-description">Lezer syntax highlighter</div>
            </li>
            <li class="package-item">
              <div class="package-name">three</div>
              <div class="package-description">
                Three.js 3D graphics library
              </div>
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  protected renderFooter(): TemplateResult {
    return html`
      <base-button variant="primary" @click=${this.handleClose}>
        Close
      </base-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "help-modal": HelpModal;
  }
}
