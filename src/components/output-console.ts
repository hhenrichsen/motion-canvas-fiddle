import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

export interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

@customElement('output-console')
export class OutputConsole extends LitElement {
  @state()
  private messages: ConsoleMessage[] = [];

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--ctp-mocha-mantle);
      border-top: 1px solid var(--ctp-mocha-surface1);
      height: 100%;
      overflow: hidden;
    }

    .console-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--ctp-mocha-crust);
      border-bottom: 1px solid var(--ctp-mocha-surface1);
      font-size: 13px;
      font-weight: 600;
      color: var(--ctp-mocha-subtext1);
    }

    .console-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .console-actions {
      display: flex;
      gap: 8px;
    }

    .console-btn {
      background: transparent;
      border: 1px solid var(--ctp-mocha-surface2);
      color: var(--ctp-mocha-text);
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .console-btn:hover {
      background: var(--ctp-mocha-surface0);
      border-color: var(--ctp-mocha-sky);
    }

    .console-body {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
    }

    .console-message {
      padding: 2px 0;
      display: flex;
      gap: 8px;
    }

    .message-type {
      font-weight: 600;
      min-width: 50px;
    }

    .message-type.log {
      color: var(--ctp-mocha-text);
    }

    .message-type.error {
      color: var(--ctp-mocha-red);
    }

    .message-type.warn {
      color: var(--ctp-mocha-yellow);
    }

    .message-type.info {
      color: var(--ctp-mocha-sky);
    }

    .message-content {
      color: var(--ctp-mocha-text);
      white-space: pre-wrap;
      word-break: break-word;
      flex: 1;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--ctp-mocha-overlay0);
      font-size: 13px;
    }

    .message-count {
      background: var(--ctp-mocha-surface1);
      color: var(--ctp-mocha-subtext0);
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

    /* Scrollbar styling */
    .console-body::-webkit-scrollbar {
      width: 8px;
    }

    .console-body::-webkit-scrollbar-track {
      background: var(--ctp-mocha-mantle);
    }

    .console-body::-webkit-scrollbar-thumb {
      background: var(--ctp-mocha-surface2);
      border-radius: 4px;
    }

    .console-body::-webkit-scrollbar-thumb:hover {
      background: var(--ctp-mocha-overlay0);
    }
  `;

  public log(message: string): void {
    this.addMessage('log', message);
  }

  public error(message: string): void {
    this.addMessage('error', message);
  }

  public warn(message: string): void {
    this.addMessage('warn', message);
  }

  public info(message: string): void {
    this.addMessage('info', message);
  }

  /**
   * Strip ANSI escape codes from text
   */
  private stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  /**
   * Check if message contains ANSI cursor control sequences
   */
  private hasCursorControl(text: string): boolean {
    // Check for cursor movement or line clear sequences
    // [1G = move to column 1, [0K = clear to end of line, etc.
    return /\x1B\[[0-9]*[GK]/.test(text);
  }

  /**
   * Process message handling carriage returns and control characters
   */
  private addMessage(type: ConsoleMessage['type'], message: string): void {
    // Check if this is a cursor control sequence (spinner update)
    const hasCursorCtrl = this.hasCursorControl(message);
    const hasCarriageReturn = message.includes('\r');

    // Strip ANSI escape codes
    const cleanMessage = this.stripAnsi(message);
    const trimmedMessage = cleanMessage.trim();

    // Skip completely empty messages
    if (!trimmedMessage) {
      return;
    }

    // Check if this looks like a spinner character only
    const isSpinnerOnly = /^[\\|/\-]$/.test(trimmedMessage);

    // If it has cursor control, carriage return, or is a spinner, try to update the last message
    if ((hasCursorCtrl || hasCarriageReturn || isSpinnerOnly) && this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];

      // Only update if it's the same type
      if (lastMessage.type === type) {
        // Replace the last message with this one (it's an update)
        this.messages = [
          ...this.messages.slice(0, -1),
          {
            type,
            message: trimmedMessage,
            timestamp: Date.now(),
          },
        ];

        // Dispatch event for message count update
        this.dispatchEvent(new CustomEvent('messagecount', {
          detail: this.messages.length,
          bubbles: true,
          composed: true,
        }));
        return;
      }
    }

    // Normal message - add it
    this.messages = [
      ...this.messages,
      {
        type,
        message: trimmedMessage,
        timestamp: Date.now(),
      },
    ];

    // Auto-scroll to bottom
    this.updateComplete.then(() => {
      const body = this.shadowRoot?.querySelector('.console-body');
      if (body) {
        body.scrollTop = body.scrollHeight;
      }
    });

    // Dispatch event for message count update
    this.dispatchEvent(new CustomEvent('messagecount', {
      detail: this.messages.length,
      bubbles: true,
      composed: true,
    }));
  }

  private handleClear = (): void => {
    this.messages = [];
    // Dispatch event for message count update
    this.dispatchEvent(new CustomEvent('messagecount', {
      detail: 0,
      bubbles: true,
      composed: true,
    }));
  };

  private formatType(type: ConsoleMessage['type']): string {
    switch (type) {
      case 'log':
        return 'LOG';
      case 'error':
        return 'ERROR';
      case 'warn':
        return 'WARN';
      case 'info':
        return 'INFO';
    }
  }

  render() {
    return html`
      <div class="console-header">
        <div class="console-title">
          <span>Console</span>
          ${this.messages.length > 0
            ? html`<span class="message-count">${this.messages.length}</span>`
            : ''}
        </div>
        <div class="console-actions">
          <button class="console-btn" @click=${this.handleClear}>
            Clear
          </button>
        </div>
      </div>
      <div class="console-body">
        ${this.messages.length === 0
          ? html`<div class="empty-state">No messages</div>`
          : this.messages.map(
              (msg) => html`
                <div class="console-message">
                  <span class="message-type ${msg.type}">
                    ${this.formatType(msg.type)}
                  </span>
                  <span class="message-content">${msg.message}</span>
                </div>
              `
            )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'output-console': OutputConsole;
  }
}
