import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('loading-overlay')
export class LoadingOverlay extends LitElement {
  @property({ type: Boolean })
  isLoading = true;

  @property({ type: String })
  message = 'Initializing Motion Canvas Fiddle...';

  @property({ type: Number })
  progress = 0;

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
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
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
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
      fill: white;
    }

    h2 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
      letter-spacing: -0.5px;
    }

    .message {
      color: #a0a0a0;
      font-size: 14px;
      margin-bottom: 30px;
      min-height: 20px;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .progress-text {
      color: #666;
      font-size: 12px;
      margin-top: 10px;
    }
  `;

  render() {
    return html`
      <div class="loading-content">
        <div class="logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
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
    this.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 300));
    this.remove();
  }
}