interface LoadingState {
  isLoading: boolean;
  message: string;
  progress: number;
}

export class LoadingController {
  private container: HTMLElement;
  private state: LoadingState = {
    isLoading: true,
    message: "Initializing Motion Canvas Fiddle...",
    progress: 0,
  };

  constructor() {
    this.container = this.createLoadingElement();
    document.body.appendChild(this.container);
  }

  createAppStructure(): void {
    const appHtml = `
      <div id="app">
        <div class="container">
          <div class="header">
            <h1>Motion Canvas Fiddle</h1>
            <div class="controls">
              <button id="reset-btn" class="btn">Reset Code</button>
              <button id="settings-btn" class="btn">⚙️ Settings</button>
              <button id="export-btn" class="btn btn-primary">📹 Export MP4</button>
              <div id="compile-status" class="compile-status"></div>
            </div>
          </div>
          <div class="split-view">
            <div class="editor-panel">
              <div class="mobile-splitter" id="mobile-splitter">
                <div class="mobile-splitter-handle"></div>
              </div>
              <div class="panel-header">Editor</div>
              <div id="editor"></div>
            </div>
            <div class="splitter" id="splitter"></div>
            <div class="preview-panel">
              <div class="panel-header">
                <span>Preview</span>
                <div id="controls-mobile" class="player-controls mobile-controls">
                  <button class="play-btn-mobile player-btn">▶</button>
                  <button class="pause-btn-mobile player-btn" style="display: none">⏸</button>
                  <button class="reset-player-btn-mobile player-btn">⏮</button>
                  <div class="progress-mobile progress-bar">
                    <div class="progress-fill-mobile progress-fill"></div>
                  </div>
                  <span class="time-mobile time">0:00 / 0:00</span>
                </div>
              </div>
              <div id="preview">
                <canvas id="canvas"></canvas>
                <div id="controls" class="player-controls desktop-controls">
                  <button id="play-btn" class="player-btn">▶</button>
                  <button id="pause-btn" class="player-btn" style="display: none">⏸</button>
                  <button id="reset-player-btn" class="player-btn">⏮</button>
                  <div id="progress" class="progress-bar">
                    <div id="progress-fill" class="progress-fill"></div>
                  </div>
                  <span id="time" class="time">0:00 / 0:00</span>
                </div>
                <div id="error" class="error-message"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Modal -->
        <div id="settings-modal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Project Settings</h3>
              <button id="close-settings" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div class="settings-group">
                <label>Canvas Resolution</label>
                <div class="input-group">
                  <input type="number" id="canvas-width" placeholder="1920" min="1" max="7680" />
                  <span>×</span>
                  <input type="number" id="canvas-height" placeholder="1080" min="1" max="4320" />
                </div>
              </div>

              <div class="settings-group">
                <label for="fps">Frame Rate (FPS)</label>
                <select id="fps">
                  <option value="24">24 FPS</option>
                  <option value="25">25 FPS</option>
                  <option value="30" selected>30 FPS</option>
                  <option value="50">50 FPS</option>
                  <option value="60">60 FPS</option>
                  <option value="120">120 FPS</option>
                </select>
              </div>

              <div class="settings-group">
                <label for="background-color">Background Color</label>
                <div class="input-group">
                  <input type="color" id="background-color" value="#1a1a1a" />
                  <button id="clear-bg" class="btn btn-secondary">Clear</button>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="apply-settings" class="btn btn-primary">Apply Settings</button>
            </div>
          </div>
        </div>

        <!-- Export Modal -->
        <div id="export-modal" class="modal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Export Animation</h3>
              <button id="close-export" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div class="settings-group">
                <label for="export-fps">Export Frame Rate</label>
                <select id="export-fps">
                  <option value="24">24 FPS</option>
                  <option value="25">25 FPS</option>
                  <option value="30" selected>30 FPS</option>
                  <option value="60">60 FPS</option>
                </select>
              </div>

              <div class="settings-group">
                <label for="export-quality">Quality</label>
                <select id="export-quality">
                  <option value="0.5">Low (Fast)</option>
                  <option value="0.8" selected>High (Recommended)</option>
                  <option value="1.0">Maximum (Slow)</option>
                </select>
              </div>

              <div class="settings-group">
                <label for="export-bitrate">Video Bitrate</label>
                <select id="export-bitrate">
                  <option value="2000000">2 Mbps (Low)</option>
                  <option value="5000000" selected>5 Mbps (Medium)</option>
                  <option value="10000000">10 Mbps (High)</option>
                  <option value="20000000">20 Mbps (Very High)</option>
                </select>
              </div>

              <div id="export-progress" class="export-progress" style="display: none;">
                <div class="progress-info">
                  <span id="export-phase">Preparing...</span>
                  <span id="export-percentage">0%</span>
                </div>
                <div class="progress-bar">
                  <div id="export-progress-fill" class="progress-fill"></div>
                </div>
                <div id="export-message" class="export-message">Initializing export...</div>
              </div>
            </div>
            <div class="modal-footer">
              <button id="start-export" class="btn btn-primary">Start Export</button>
              <button id="cancel-export" class="btn btn-secondary" style="display: none;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", appHtml);
  }

  private createLoadingElement(): HTMLElement {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-screen";
    loadingDiv.innerHTML = `
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="loading-logo">
            <div class="loading-spinner"></div>
          </div>
          <h2 class="loading-title">Motion Canvas Fiddle</h2>
          <p class="loading-message">${this.state.message}</p>
          <div class="loading-progress">
            <div class="loading-progress-bar">
              <div class="loading-progress-fill" style="width: ${
                this.state.progress
              }%"></div>
            </div>
            <span class="loading-percentage">${Math.round(
              this.state.progress,
            )}%</span>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      #loading-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        background: var(--ctp-mocha-base, #1e1e2e);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ctp-mocha-text, #cdd6f4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        transition: opacity 0.3s ease-out;
      }

      .loading-overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }

      .loading-content {
        text-align: center;
        max-width: 400px;
        padding: 2rem;
      }

      .loading-logo {
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: center;
      }

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid var(--ctp-mocha-surface1, #313244);
        border-top: 3px solid var(--ctp-mocha-sky, #89dceb);
        border-radius: 50%;
        animation: loading-spin 1s linear infinite;
      }

      @keyframes loading-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-title {
        font-size: 1.75rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        color: var(--ctp-mocha-sky, #89dceb);
      }

      .loading-message {
        font-size: 1rem;
        margin: 0 0 1.5rem 0;
        color: var(--ctp-mocha-subtext1, #bac2de);
        opacity: 0.8;
      }

      .loading-progress {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
      }

      .loading-progress-bar {
        width: 100%;
        height: 6px;
        background: var(--ctp-mocha-surface1, #313244);
        border-radius: 3px;
        overflow: hidden;
      }

      .loading-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--ctp-mocha-sky, #89dceb), var(--ctp-mocha-blue, #89b4fa));
        border-radius: 3px;
        transition: width 0.2s ease-out;
      }

      .loading-percentage {
        font-size: 0.875rem;
        color: var(--ctp-mocha-subtext0, #a6adc8);
        font-weight: 500;
        min-width: 3rem;
      }

      #loading-screen.fade-out {
        opacity: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return loadingDiv;
  }

  updateProgress(progress: number, message?: string): void {
    this.state.progress = Math.max(0, Math.min(100, progress));
    if (message) {
      this.state.message = message;
    }

    const messageEl = this.container.querySelector(".loading-message");
    const progressFill = this.container.querySelector(
      ".loading-progress-fill",
    ) as HTMLElement;
    const percentage = this.container.querySelector(".loading-percentage");

    if (messageEl) messageEl.textContent = this.state.message;
    if (progressFill) progressFill.style.width = `${this.state.progress}%`;
    if (percentage)
      percentage.textContent = `${Math.round(this.state.progress)}%`;
  }

  hide(): Promise<void> {
    return new Promise((resolve) => {
      this.container.classList.add("fade-out");
      setTimeout(() => {
        if (this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
        resolve();
      }, 300);
    });
  }
}
