import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("loading-overlay")
export class LoadingOverlay extends LitElement {
  @property({ type: Boolean })
  isLoading = true;

  @property({ type: String })
  message = "Initializing Motion Canvas Fiddle...";

  @property({ type: Number })
  progress = 0;

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--ctp-mocha-base);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      transition: opacity 0.3s ease;
    }

    :host([hidden]) {
      opacity: 0;
      pointer-events: none;
    }

    .loading-content {
      text-align: center;
      max-width: 400px;
      padding: 40px;
    }

    .logo {
      width: 120px;
      height: 120px;
      margin: 0 auto 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        transform: scale(1);
        opacity: 0.9;
      }
      50% {
        transform: scale(1.05);
        opacity: 1;
      }
    }

    .logo svg {
      width: 80px;
      height: 80px;
      fill: var(--ctp-mocha-sky);
    }

    h2 {
      color: var(--ctp-mocha-text);
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
      letter-spacing: -0.5px;
    }

    .message {
      color: var(--ctp-mocha-subtext0);
      font-size: 14px;
      margin-bottom: 30px;
      min-height: 20px;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--ctp-mocha-surface0);
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: var(--ctp-mocha-sky);
      transition: width 0.3s ease;
    }

    .progress-text {
      color: var(--ctp-mocha-overlay0);
      font-size: 12px;
      margin-top: 10px;
    }
  `;

  render() {
    return html`
      <div class="loading-content">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M23.6,17c-0.1,0.7-0.7,1.1-1.3,1.1c-0.1,0-0.1,0-0.2,0l-4.8-0.8l0.8,4.8c0.1,0.7-0.4,1.4-1.1,1.5c-0.1,0-0.1,0-0.2,0 c-0.7,0-1.2-0.5-1.3-1.1l-0.7-4.8l-4.3,2.2c-0.7,0.3-1.5,0.1-1.8-0.6c-0.1-0.2-0.1-0.4-0.1-0.6c0-0.5,0.3-0.9,0.7-1.2l4.3-2.2 L10.1,12c-0.5-0.5-0.5-1.4,0-1.9c0.3-0.3,0.6-0.4,0.9-0.4s0.7,0.1,0.9,0.4l3.4,3.4l2.2-4.3c0.3-0.7,1.1-0.9,1.8-0.6 c0.5,0.2,0.7,0.7,0.7,1.2c0,0.2-0.1,0.4-0.1,0.6l-2.2,4.3l4.8,0.7C23.3,15.6,23.7,16.3,23.6,17z"
            ></path>
            <path
              d="M15.5,8.9L15.5,8.9c-0.5,0.5-1.4,0.5-1.9,0l-2.8-2.8c-0.5-0.5-0.5-1.4,0-1.9l0,0c0.5-0.5,1.4-0.5,1.9,0L15.5,7 C16,7.5,16,8.4,15.5,8.9z"
            ></path>
            <path
              d="M9.4,2.8L9.4,2.8C8.8,3.3,8,3.3,7.5,2.8l0,0C7,2.2,7,1.4,7.5,0.9l0,0c0.5-0.5,1.4-0.5,1.9,0l0,0C9.9,1.4,9.9,2.2,9.4,2.8z"
            ></path>
            <path
              d="M8.4,8.4L8.4,8.4c-0.5,0.5-1.4,0.5-1.9,0L2.3,4.2c-0.5-0.5-0.5-1.4,0-1.9l0,0c0.5-0.5,1.4-0.5,1.9,0l4.2,4.2 C8.9,7.1,8.9,7.9,8.4,8.4z"
            ></path>
            <path
              d="M8.9,15.5L8.9,15.5C8.4,16,7.5,16,7,15.5L1.3,9.8c-0.5-0.5-0.5-1.4,0-1.9l0,0c0.5-0.5,1.4-0.5,1.9,0l5.7,5.7 C9.4,14.1,9.4,15,8.9,15.5z"
            ></path>
          </svg>
        </div>
        <h2>Motion Canvas Fiddle</h2>
        <div class="message">${this.message}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this.progress}%"></div>
        </div>
        <div class="progress-text">${Math.round(this.progress)}%</div>
      </div>
    `;
  }

  updateProgress(progress: number, message: string) {
    this.progress = progress;
    this.message = message;
  }

  async hide() {
    this.style.opacity = "0";
    await new Promise((resolve) => setTimeout(resolve, 300));
    this.remove();
  }
}
