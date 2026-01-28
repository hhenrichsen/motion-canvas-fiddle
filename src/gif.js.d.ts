declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number | null;
    height?: number | null;
    workerScript?: string;
    dither?: string | false;
    repeat?: number;
    background?: string;
    transparent?: string | null;
    debug?: boolean;
  }

  interface FrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D | ImageData,
      options?: FrameOptions
    ): void;
    on(event: "start", callback: () => void): void;
    on(event: "progress", callback: (progress: number) => void): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "abort", callback: () => void): void;
    render(): void;
    abort(): void;
    running: boolean;
  }

  export default GIF;
}
