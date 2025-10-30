import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatTime } from '../utils/index.js';

@customElement('player-controls')
export class PlayerControls extends LitElement {
  @property({ type: Boolean })
  playing = false;

  @property({ type: Number })
  currentFrame = 0;

  @property({ type: Number })
  duration = 0;

  @property({ type: Number })
  fps = 30;

  private isDragging = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 12px;
      max-width: 500px;
      width: 100%;
    }

    .player-btn {
      background: none;
      border: none;
      color: var(--ctp-mocha-subtext0);
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      border-radius: 4px;
    }

    .player-btn:hover {
      color: var(--ctp-mocha-text);
      background: var(--ctp-mocha-surface0);
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      background: var(--ctp-mocha-surface0);
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      min-width: 60px;
    }

    .progress-fill {
      height: 100%;
      background: var(--ctp-mocha-blue);
      border-radius: 3px;
      pointer-events: none;
      transition: width 0.1s;
    }

    .time {
      color: var(--ctp-mocha-subtext0);
      font-size: 12px;
      min-width: 80px;
      text-align: right;
      font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
    }

    @media (max-width: 768px) {
      :host {
        padding: 0 8px;
        gap: 6px;
        flex-wrap: nowrap;
      }

      .player-btn {
        font-size: 14px;
        padding: 2px 4px;
        flex-shrink: 0;
      }

      .progress-bar {
        min-width: 80px;
        height: 6px;
      }

      .time {
        font-size: 10px;
        min-width: 60px;
        flex-shrink: 0;
      }
    }
  `;

  render() {
    const progress = this.duration > 0 ? (this.currentFrame / this.duration) * 100 : 0;
    const currentTime = formatTime(this.currentFrame / this.fps);
    const totalTime = formatTime(this.duration / this.fps);

    return html`
      <button class="player-btn" @click=${this.handlePlayPause}>
        ${this.playing ? '⏸' : '▶'}
      </button>
      <button class="player-btn" @click=${this.handleReset}>⏮</button>
      <div
        class="progress-bar"
        @mousedown=${this.handleMouseDown}
        @click=${this.handleClick}
      >
        <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
      </div>
      <span class="time">${currentTime} / ${totalTime}</span>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }


  private handlePlayPause = (): void => {
    this.dispatchEvent(new CustomEvent('play-pause'));
  };

  private handleReset = (): void => {
    this.dispatchEvent(new CustomEvent('reset'));
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.handleSeek(e);
    e.preventDefault();
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      this.handleSeek(e);
      e.preventDefault();
    }
  };

  private handleMouseUp = () => {
    this.isDragging = false;
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.isDragging) {
      this.handleSeek(e);
    }
  };

  private handleSeek = (e: MouseEvent): void => {
    if (this.duration <= 0) return;

    const progressBar = this.shadowRoot?.querySelector('.progress-bar') as HTMLElement;
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const targetFrame = Math.floor(percentage * this.duration);

    this.dispatchEvent(new CustomEvent('seek', { detail: targetFrame }));
  };
}