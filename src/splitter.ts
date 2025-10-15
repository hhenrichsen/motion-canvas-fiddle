export class SplitterController {
  private splitter: HTMLElement | null = null;
  private mobileSplitter: HTMLElement | null = null;
  private editorPanel: HTMLElement;
  private splitView: HTMLElement;
  private isDragging = false;
  private hasDragged = false;
  private minPanelSize: number;
  private isMobile: boolean;
  private defaultEditorSize: number;
  private maxEditorSize: number;

  constructor() {
    this.editorPanel = document.querySelector(".editor-panel") as HTMLElement;
    this.splitView = document.querySelector(".split-view") as HTMLElement;
    this.isMobile = window.innerWidth <= 768;
    this.minPanelSize = this.isMobile ? 100 : 350;

    // Set default sizes based on mode
    this.defaultEditorSize = 50; // percentage - always half
    this.maxEditorSize = this.isMobile ? 85 : 80; // percentage

    if (this.isMobile) {
      this.mobileSplitter = document.getElementById("mobile-splitter");
    } else {
      this.splitter = document.getElementById("splitter");
    }

    this.initialize();
  }

  private initialize(): void {
    const activeSplitter = this.isMobile ? this.mobileSplitter : this.splitter;
    if (!activeSplitter) return;

    activeSplitter.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );
    activeSplitter.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
      { passive: false }
    );

    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("touchmove", this.handleTouchMove.bind(this), {
      passive: false,
    });

    document.addEventListener("mouseup", this.handleMouseUp.bind(this));
    document.addEventListener("touchend", this.handleMouseUp.bind(this));

    // Prevent text selection during drag
    activeSplitter.addEventListener("selectstart", (e) => e.preventDefault());
    activeSplitter.addEventListener("dragstart", (e) => e.preventDefault());
  }

  private handleMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.hasDragged = false;
    document.body.style.cursor = this.isMobile ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  private handleTouchStart(event: TouchEvent): void {
    this.isDragging = true;
    this.hasDragged = false;
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    this.hasDragged = true;

    if (this.isMobile) {
      this.handleVerticalResize(event.clientY);
    } else {
      this.handleHorizontalResize(event.clientX);
    }

    event.preventDefault();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length === 0) return;

    this.hasDragged = true;

    const touch = event.touches[0];
    if (this.isMobile) {
      this.handleVerticalResize(touch.clientY);
    } else {
      this.handleHorizontalResize(touch.clientX);
    }

    event.preventDefault();
  }

  private handleHorizontalResize(clientX: number): void {
    const splitViewRect = this.splitView.getBoundingClientRect();
    const mouseX = clientX - splitViewRect.left;

    // Calculate the percentage for the editor panel
    const totalWidth = splitViewRect.width;
    const splitterWidth = 4; // width of the splitter
    const availableWidth = totalWidth - splitterWidth;

    // Ensure minimum widths for both panels
    const minEditorWidth = this.minPanelSize;
    const minPreviewWidth = this.minPanelSize;
    const maxEditorWidth = availableWidth - minPreviewWidth;

    const newEditorWidth = Math.max(
      minEditorWidth,
      Math.min(maxEditorWidth, mouseX)
    );
    const editorPercentage = (newEditorWidth / totalWidth) * 100;

    this.editorPanel.style.flex = `0 0 ${editorPercentage}%`;
  }

  private handleVerticalResize(clientY: number): void {
    const splitViewRect = this.splitView.getBoundingClientRect();
    // Calculate distance from bottom of split view to get the desired editor height
    const mouseYFromBottom = splitViewRect.bottom - clientY;

    // Calculate the percentage for the editor panel
    const totalHeight = splitViewRect.height;
    const splitterHeight = 8; // height of the mobile splitter
    const availableHeight = totalHeight - splitterHeight;

    // Ensure minimum heights for both panels
    const minPreviewHeight = this.minPanelSize;
    const minEditorHeight = this.minPanelSize;
    const maxEditorHeight = availableHeight - minPreviewHeight;

    // mouseYFromBottom represents the desired editor height
    const newEditorHeight = Math.max(
      minEditorHeight,
      Math.min(maxEditorHeight, mouseYFromBottom)
    );
    const editorPercentage = (newEditorHeight / totalHeight) * 100;

    this.editorPanel.style.flex = `0 0 ${editorPercentage}%`;
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // Handle click (no drag) to toggle maximize
      if (!this.hasDragged) {
        this.toggleEditorSize();
      }
    }
  }

  private toggleEditorSize(): void {
    const currentSize = this.getCurrentEditorSize();

    // If close to max size (within 5%), reset to default (50%)
    if (currentSize >= this.maxEditorSize - 5) {
      this.setEditorSize(this.defaultEditorSize);
    } else {
      // Otherwise, maximize
      this.setEditorSize(this.maxEditorSize);
    }
  }

  private getCurrentEditorSize(): number {
    const flexValue = this.editorPanel.style.flex;
    const match = flexValue.match(/0 0 (\d+(?:\.\d+)?)%/);
    return match ? parseFloat(match[1]) : this.defaultEditorSize;
  }

  private setEditorSize(percentage: number): void {
    this.editorPanel.style.flex = `0 0 ${percentage}%`;
  }

  public destroy(): void {
    const activeSplitter = this.isMobile ? this.mobileSplitter : this.splitter;
    if (activeSplitter) {
      activeSplitter.removeEventListener(
        "mousedown",
        this.handleMouseDown.bind(this)
      );
      activeSplitter.removeEventListener(
        "touchstart",
        this.handleTouchStart.bind(this)
      );
    }

    document.removeEventListener("mousemove", this.handleMouseMove.bind(this));
    document.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    document.removeEventListener("mouseup", this.handleMouseUp.bind(this));
    document.removeEventListener("touchend", this.handleMouseUp.bind(this));
  }
}
