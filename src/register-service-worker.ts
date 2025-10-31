/**
 * Service Worker Registration and Helper Functions
 * This code runs in the main thread (not the service worker context)
 */

export interface MCFiddleServiceWorker {
  cacheCompiledScene: (key: string, code: string) => Promise<boolean>;
  getCachedScene: (key: string) => Promise<string | null>;
  clearCompiledCache: () => Promise<boolean>;
  isCrossOriginIsolated: () => boolean;
  isOffline: () => boolean;
}

/**
 * Register the service worker and set up helper functions
 *
 * The service worker provides:
 * 1. Cross-origin isolation headers (COOP/COEP) for WebContainer support
 * 2. Cache-first strategy for faster loading
 * 3. Offline support for lazy-loaded chunks
 * 4. Compiled scene caching
 */
export async function registerServiceWorker(): Promise<void> {
  // Check if we're in a secure context
  if (!window.isSecureContext) {
    console.warn("[SW] Service worker requires HTTPS or localhost");
    return;
  }

  // Check if service workers are supported
  if (!("serviceWorker" in navigator)) {
    console.warn("[SW] Service workers not supported");
    return;
  }

  try {
    // Register the service worker
    // Built from src/service-worker.ts to public/service-worker.js
    // Vite serves it from public/ in dev, copies to dist/ in production
    await navigator.serviceWorker.register("./service-worker.js", {
      scope: "./",
    });

    console.log("[SW] Service worker registered");

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Check if we need to reload to apply cross-origin isolation headers
    // (only needed if not already isolated)
    if (!window.crossOriginIsolated) {
      // Check if we've already reloaded once
      const reloadKey = "sw-reload-attempted";
      const hasReloaded = sessionStorage.getItem(reloadKey);

      if (!hasReloaded) {
        console.log("[SW] Reloading to apply cross-origin isolation headers");
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
      } else {
        console.warn("[SW] Cross-origin isolation not achieved after reload");
        // Clear the flag for next time
        sessionStorage.removeItem(reloadKey);
      }
    } else {
      // Already cross-origin isolated (or just became isolated)
      sessionStorage.removeItem("sw-reload-attempted");
      console.log("[SW] Cross-origin isolation enabled, caching active");
    }
  } catch (error) {
    console.error("[SW] Service worker registration failed:", error);
  }
}

/**
 * Expose helper functions to main application
 */
export function createServiceWorkerAPI(): MCFiddleServiceWorker {
  return {
    /**
     * Cache a compiled scene
     */
    cacheCompiledScene: async (key: string, code: string): Promise<boolean> => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) {
        return false;
      }

      controller.postMessage({
        type: "CACHE_COMPILED_SCENE",
        key,
        code,
      });

      return true;
    },

    /**
     * Get a cached compiled scene
     */
    getCachedScene: async (key: string): Promise<string | null> => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) {
        return null;
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event: MessageEvent) => {
          if (event.data.found) {
            resolve(event.data.code as string);
          } else {
            resolve(null);
          }
        };

        controller.postMessage({ type: "GET_CACHED_SCENE", key }, [
          messageChannel.port2,
        ]);
      });
    },

    /**
     * Clear the compiled scene cache
     */
    clearCompiledCache: async (): Promise<boolean> => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) {
        return false;
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event: MessageEvent) => {
          resolve(event.data.success as boolean);
        };

        controller.postMessage({ type: "CLEAR_COMPILED_CACHE" }, [
          messageChannel.port2,
        ]);
      });
    },

    /**
     * Check if cross-origin isolation is enabled
     */
    isCrossOriginIsolated: (): boolean => {
      return window.crossOriginIsolated || false;
    },

    /**
     * Check if the app is currently offline
     */
    isOffline: (): boolean => {
      return !navigator.onLine;
    },
  };
}

// Auto-register and expose API on window
if (typeof window !== "undefined") {
  registerServiceWorker().catch((error) => {
    console.error("[SW] Failed to register service worker:", error);
  });

  // Expose API globally for compatibility
  (window as any).MCFiddleServiceWorker = createServiceWorkerAPI();
}
