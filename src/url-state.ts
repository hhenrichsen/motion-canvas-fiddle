import * as LZString from "lz-string";

export interface ProjectSettings {
  width?: number;
  height?: number;
  fps?: number;
  background?: string | null;
}

export class URLStateManager {
  private static readonly FRAME_PARAM = "f";
  private static readonly CODE_PARAM = "c";
  private static readonly SETTINGS_PARAM = "s";

  static updateFrame(frame: number): void {
    const url = new URL(window.location.href);

    if (frame > 0) {
      url.searchParams.set(this.FRAME_PARAM, frame.toString());
    } else {
      url.searchParams.delete(this.FRAME_PARAM);
    }

    // Update URL without causing page reload
    window.history.replaceState({}, "", url.toString());
  }

  static updateCode(code: string): void {
    const url = new URL(window.location.href);

    if (code && code.trim()) {
      // Compress the code using lz-string
      const compressed = LZString.compressToEncodedURIComponent(code);

      // Check if the resulting URL would be too long
      const testUrl = new URL(url);
      testUrl.searchParams.set(this.CODE_PARAM, compressed);

      // Most browsers support URLs up to 2048 characters, but we'll be conservative
      // and use 2000 characters as the limit
      if (testUrl.toString().length > 2000) {
        console.warn(
          "Code is too large to save in URL (would exceed length limit)"
        );
        return;
      }

      url.searchParams.set(this.CODE_PARAM, compressed);
    } else {
      url.searchParams.delete(this.CODE_PARAM);
    }

    // Update URL without causing page reload
    window.history.replaceState({}, "", url.toString());
  }

  static getInitialFrame(): number {
    const url = new URL(window.location.href);
    const frameParam = url.searchParams.get(this.FRAME_PARAM);

    if (frameParam) {
      const frame = parseInt(frameParam, 10);
      return isNaN(frame) ? 0 : Math.max(0, frame);
    }

    return 0;
  }

  static getInitialCode(): string | null {
    const url = new URL(window.location.href);
    const codeParam = url.searchParams.get(this.CODE_PARAM);

    if (codeParam) {
      try {
        // Decompress the code using lz-string
        const decompressed =
          LZString.decompressFromEncodedURIComponent(codeParam);
        return decompressed || null;
      } catch (error) {
        console.warn("Failed to decompress code from URL:", error);
        return null;
      }
    }

    return null;
  }

  static clearFrame(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.FRAME_PARAM);
    window.history.replaceState({}, "", url.toString());
  }

  static clearCode(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.CODE_PARAM);
    window.history.replaceState({}, "", url.toString());
  }

  static updateSettings(settings: ProjectSettings): void {
    const url = new URL(window.location.href);

    if (settings && Object.keys(settings).length > 0) {
      // Filter out undefined values and create a clean settings object
      const cleanSettings: any = {};
      if (settings.width !== undefined) cleanSettings.width = settings.width;
      if (settings.height !== undefined) cleanSettings.height = settings.height;
      if (settings.fps !== undefined) cleanSettings.fps = settings.fps;
      if (settings.background !== undefined)
        cleanSettings.background = settings.background;

      if (Object.keys(cleanSettings).length > 0) {
        const compressed = LZString.compressToEncodedURIComponent(
          JSON.stringify(cleanSettings)
        );
        url.searchParams.set(this.SETTINGS_PARAM, compressed);
      } else {
        url.searchParams.delete(this.SETTINGS_PARAM);
      }
    } else {
      url.searchParams.delete(this.SETTINGS_PARAM);
    }

    window.history.replaceState({}, "", url.toString());
  }

  static getInitialSettings(): ProjectSettings | null {
    const url = new URL(window.location.href);
    const settingsParam = url.searchParams.get(this.SETTINGS_PARAM);

    if (settingsParam) {
      try {
        const decompressed =
          LZString.decompressFromEncodedURIComponent(settingsParam);
        if (decompressed) {
          return JSON.parse(decompressed) as ProjectSettings;
        }
      } catch (error) {
        console.warn("Failed to decompress settings from URL:", error);
      }
    }

    return null;
  }

  static clearSettings(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.SETTINGS_PARAM);
    window.history.replaceState({}, "", url.toString());
  }

  static clearAll(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete(this.FRAME_PARAM);
    url.searchParams.delete(this.CODE_PARAM);
    url.searchParams.delete(this.SETTINGS_PARAM);
    window.history.replaceState({}, "", url.toString());
  }
}
