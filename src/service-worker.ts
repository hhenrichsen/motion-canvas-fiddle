/**
 * Motion Canvas Fiddle Service Worker
 *
 * Provides:
 * 1. Cross-origin isolation headers (COOP/COEP) for WebContainer support
 * 2. Intelligent caching strategies for performance
 * 3. Version-based cache management
 */

/// <reference lib="webworker" />

// Type the global scope as ServiceWorkerGlobalScope
export type {}; // Make this a module
declare const globalThis: ServiceWorkerGlobalScope;

const VERSION = "1.0.0";
const CACHE_PREFIX = "mc-fiddle";

const CACHES = {
  static: `${CACHE_PREFIX}-static-${VERSION}`,
  compiled: `${CACHE_PREFIX}-compiled-${VERSION}`,
  runtime: `${CACHE_PREFIX}-runtime-${VERSION}`,
  chunks: `${CACHE_PREFIX}-chunks-${VERSION}`,
} as const;

// Resources to cache on install
const PRECACHE_URLS = ["./", "./index.html"];

// ============================================================================
// INSTALL
// ============================================================================

globalThis.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker version", VERSION);

  event.waitUntil(
    (async () => {
      // Skip waiting to activate immediately
      await globalThis.skipWaiting();

      // Precache essential resources
      const cache = await caches.open(CACHES.static);
      await cache.addAll(PRECACHE_URLS);

      console.log("[SW] Precached essential resources");
    })(),
  );
});

// ============================================================================
// ACTIVATE
// ============================================================================

globalThis.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker version", VERSION);

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              !Object.values(CACHES).includes(
                key as (typeof CACHES)[keyof typeof CACHES],
              ),
          )
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          }),
      );

      // Take control of all clients immediately
      await globalThis.clients.claim();

      console.log("[SW] Service worker activated");
    })(),
  );
});

// ============================================================================
// FETCH
// ============================================================================

globalThis.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle requests from our origin
  if (url.origin !== globalThis.location.origin) {
    return;
  }

  // Don't intercept Vite dev server files (node_modules, @vite, @id, etc.)
  if (
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/@vite/") ||
    url.pathname.startsWith("/@id/") ||
    url.pathname.startsWith("/@fs/") ||
    url.searchParams.has("import") || // Vite import analysis
    url.searchParams.has("t") // Vite timestamp for HMR
  ) {
    return;
  }

  event.respondWith(
    (async (): Promise<Response> => {
      const path = url.pathname;

      // Determine strategy based on resource type
      const useNetworkFirst =
        path.endsWith(".html") || path === "/" || !path.includes(".");

      if (useNetworkFirst) {
        // Network-first for HTML to get app updates
        try {
          const response = await fetch(request);
          const headers = new Headers(response.headers);
          headers.set("Cross-Origin-Embedder-Policy", "credentialless");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          headers.set("Cross-Origin-Resource-Policy", "cross-origin");

          const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          });

          await applyCachingStrategy(request, modifiedResponse.clone());
          return modifiedResponse;
        } catch (error) {
          const cachedResponse = await getCachedResponse(request);
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      } else {
        // Cache-first for static assets and JS chunks (faster + offline-friendly)
        const cachedResponse = await getCachedResponse(request);
        if (cachedResponse) {
          console.log("[SW] Serving from cache:", path);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        try {
          console.log("[SW] Cache miss, fetching from network:", path);
          const response = await fetch(request);
          const headers = new Headers(response.headers);
          headers.set("Cross-Origin-Embedder-Policy", "credentialless");
          headers.set("Cross-Origin-Opener-Policy", "same-origin");
          headers.set("Cross-Origin-Resource-Policy", "cross-origin");

          const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: headers,
          });

          await applyCachingStrategy(request, modifiedResponse.clone());
          return modifiedResponse;
        } catch (error) {
          console.error("[SW] Network failed and no cache for:", path);
          throw error;
        }
      }
    })(),
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cached response from appropriate cache
 */
async function getCachedResponse(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Try chunks cache first (for lazy-loaded modules)
  if (path.includes("/assets/") && path.endsWith(".js")) {
    const chunksCache = await caches.open(CACHES.chunks);
    const cached = await chunksCache.match(request);
    if (cached) return cached;
  }

  // Try static cache
  const staticCache = await caches.open(CACHES.static);
  const staticCached = await staticCache.match(request);
  if (staticCached) return staticCached;

  // Try runtime cache
  const runtimeCache = await caches.open(CACHES.runtime);
  const runtimeCached = await runtimeCache.match(request);
  if (runtimeCached) return runtimeCached;

  return null;
}

/**
 * Apply appropriate caching strategy based on resource type
 */
async function applyCachingStrategy(
  request: Request,
  response: Response,
): Promise<void> {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Cache lazy-loaded chunks separately for offline support
    if (path.includes("/assets/") && path.endsWith(".js")) {
      const cache = await caches.open(CACHES.chunks);
      await cache.put(request, response);
      return;
    }

    // Cache static assets (CSS, fonts, images)
    if (
      path.endsWith(".css") ||
      path.endsWith(".woff2") ||
      path.endsWith(".woff") ||
      path.endsWith(".png") ||
      path.endsWith(".jpg") ||
      path.endsWith(".svg")
    ) {
      const cache = await caches.open(CACHES.static);
      await cache.put(request, response);
      return;
    }

    // Cache main JS files in static cache
    if (path.endsWith(".js") && !path.includes("/assets/")) {
      const cache = await caches.open(CACHES.static);
      await cache.put(request, response);
      return;
    }

    // Cache HTML (runtime cache)
    if (path.endsWith(".html") || path === "/" || !path.includes(".")) {
      const cache = await caches.open(CACHES.runtime);
      await cache.put(request, response);
      return;
    }
  } catch (error) {
    console.error("[SW] Error caching resource:", path, error);
  }
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

interface MessageEventData {
  type: string;
  key?: string;
  code?: string;
}

globalThis.addEventListener("message", (event) => {
  const data = event.data as MessageEventData;

  if (data.type === "CACHE_COMPILED_SCENE") {
    const { key, code } = data;
    if (!key || !code) return;

    caches.open(CACHES.compiled).then((cache) => {
      const response = new Response(code, {
        headers: { "Content-Type": "application/javascript" },
      });
      cache.put(new Request(`/compiled/${key}`), response);
      console.log("[SW] Cached compiled scene:", key);
    });
  }

  if (data.type === "GET_CACHED_SCENE") {
    const { key } = data;
    if (!key) return;

    caches.open(CACHES.compiled).then((cache) => {
      cache.match(new Request(`/compiled/${key}`)).then((response) => {
        if (response) {
          response.text().then((code) => {
            event.ports[0].postMessage({ found: true, code });
          });
        } else {
          event.ports[0].postMessage({ found: false });
        }
      });
    });
  }

  if (data.type === "CLEAR_COMPILED_CACHE") {
    caches.delete(CACHES.compiled).then(() => {
      console.log("[SW] Cleared compiled scene cache");
      event.ports[0].postMessage({ success: true });
    });
  }

  if (data.type === "DEREGISTER") {
    globalThis.registration.unregister().then(() => {
      console.log("[SW] Service worker unregistered");
    });
  }
});
