/**
 * Motion Canvas Fiddle Service Worker
 *
 * Provides:
 * 1. Cross-origin isolation headers (COOP/COEP) for WebContainer support
 * 2. Intelligent caching strategies for performance
 * 3. Version-based cache management
 */

const VERSION = '1.0.0';
const CACHE_PREFIX = 'mc-fiddle';

const CACHES = {
  static: `${CACHE_PREFIX}-static-${VERSION}`,
  compiled: `${CACHE_PREFIX}-compiled-${VERSION}`,
  runtime: `${CACHE_PREFIX}-runtime-${VERSION}`,
};

// Resources to cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
];

// Check if we're running in the service worker context
const isServiceWorker = typeof window === 'undefined';

if (isServiceWorker) {
  // ============================================================================
  // SERVICE WORKER CONTEXT
  // ============================================================================

  self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker version', VERSION);

    event.waitUntil(
      (async () => {
        // Skip waiting to activate immediately
        await self.skipWaiting();

        // Precache essential resources
        const cache = await caches.open(CACHES.static);
        await cache.addAll(PRECACHE_URLS);

        console.log('[SW] Precached essential resources');
      })()
    );
  });

  self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker version', VERSION);

    event.waitUntil(
      (async () => {
        // Clean up old caches
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys
            .filter(key => key.startsWith(CACHE_PREFIX) && !Object.values(CACHES).includes(key))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );

        // Take control of all clients immediately
        await self.clients.claim();

        console.log('[SW] Service worker activated');
      })()
    );
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle requests from our origin
    if (url.origin !== location.origin) {
      return;
    }

    event.respondWith(
      (async () => {
        // Always fetch and inject headers
        const response = await fetch(request);

        // Clone the response to modify headers
        const headers = new Headers(response.headers);

        // Inject cross-origin isolation headers
        // Use credentialless mode for better compatibility
        headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

        // Create new response with modified headers
        const modifiedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers,
        });

        // Determine caching strategy based on resource type
        await applyCachingStrategy(request, modifiedResponse.clone());

        return modifiedResponse;
      })()
    );
  });

  /**
   * Apply appropriate caching strategy based on resource type
   */
  async function applyCachingStrategy(request, response) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Cache static assets (JS, CSS, images)
      if (
        path.endsWith('.js') ||
        path.endsWith('.css') ||
        path.endsWith('.woff2') ||
        path.endsWith('.woff') ||
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.svg')
      ) {
        const cache = await caches.open(CACHES.static);
        await cache.put(request, response);
        return;
      }

      // Cache HTML (runtime cache)
      if (path.endsWith('.html') || path === '/' || !path.includes('.')) {
        const cache = await caches.open(CACHES.runtime);
        await cache.put(request, response);
        return;
      }
    } catch (error) {
      console.error('[SW] Error caching resource:', path, error);
    }
  }

  /**
   * Store compiled scene in cache
   */
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_COMPILED_SCENE') {
      const { key, code } = event.data;

      caches.open(CACHES.compiled).then(cache => {
        const response = new Response(code, {
          headers: { 'Content-Type': 'application/javascript' }
        });
        cache.put(new Request(`/compiled/${key}`), response);
        console.log('[SW] Cached compiled scene:', key);
      });
    }

    if (event.data && event.data.type === 'GET_CACHED_SCENE') {
      const { key } = event.data;

      caches.open(CACHES.compiled).then(cache => {
        cache.match(new Request(`/compiled/${key}`)).then(response => {
          if (response) {
            response.text().then(code => {
              event.ports[0].postMessage({ found: true, code });
            });
          } else {
            event.ports[0].postMessage({ found: false });
          }
        });
      });
    }

    if (event.data && event.data.type === 'CLEAR_COMPILED_CACHE') {
      caches.delete(CACHES.compiled).then(() => {
        console.log('[SW] Cleared compiled scene cache');
        event.ports[0].postMessage({ success: true });
      });
    }

    if (event.data && event.data.type === 'DEREGISTER') {
      self.registration.unregister().then(() => {
        console.log('[SW] Service worker unregistered');
      });
    }
  });

} else {
  // ============================================================================
  // MAIN THREAD CONTEXT (Registration)
  // ============================================================================

  (async () => {
    // Check if we're in a secure context
    if (!window.isSecureContext) {
      console.warn('[SW] Service worker requires HTTPS or localhost');
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service workers not supported');
      return;
    }

    // Check if already cross-origin isolated
    if (window.crossOriginIsolated) {
      console.log('[SW] Already cross-origin isolated');
      return;
    }

    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register(
        './service-worker.js',
        { scope: './' }
      );

      console.log('[SW] Service worker registered');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Check if we need to reload to apply headers
      if (!window.crossOriginIsolated) {
        // Check if we've already reloaded once
        const reloadKey = 'sw-reload-attempted';
        const hasReloaded = sessionStorage.getItem(reloadKey);

        if (!hasReloaded) {
          console.log('[SW] Reloading to apply cross-origin isolation headers');
          sessionStorage.setItem(reloadKey, 'true');
          window.location.reload();
        } else {
          console.warn('[SW] Cross-origin isolation not achieved after reload');
          // Clear the flag for next time
          sessionStorage.removeItem(reloadKey);
        }
      } else {
        // Success! Clear reload flag
        sessionStorage.removeItem('sw-reload-attempted');
        console.log('[SW] Cross-origin isolation enabled');
      }
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
    }
  })();

  // Expose helper functions to main application
  window.MCFiddleServiceWorker = {
    /**
     * Cache a compiled scene
     */
    cacheCompiledScene: async (key, code) => {
      if (!navigator.serviceWorker.controller) {
        return false;
      }

      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_COMPILED_SCENE',
        key,
        code
      });

      return true;
    },

    /**
     * Get a cached compiled scene
     */
    getCachedScene: async (key) => {
      if (!navigator.serviceWorker.controller) {
        return null;
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
          if (event.data.found) {
            resolve(event.data.code);
          } else {
            resolve(null);
          }
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHED_SCENE', key },
          [messageChannel.port2]
        );
      });
    },

    /**
     * Clear the compiled scene cache
     */
    clearCompiledCache: async () => {
      if (!navigator.serviceWorker.controller) {
        return false;
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };

        navigator.serviceWorker.controller.postMessage(
          { type: 'CLEAR_COMPILED_CACHE' },
          [messageChannel.port2]
        );
      });
    },

    /**
     * Check if cross-origin isolation is enabled
     */
    isCrossOriginIsolated: () => {
      return window.crossOriginIsolated || false;
    }
  };
}
