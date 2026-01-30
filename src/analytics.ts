/**
 * Analytics module for PostHog integration.
 * Lazy-loads PostHog only when online and fails gracefully on errors.
 */
import { canUseWebContainer } from "./offline";

let posthogInstance: typeof import("posthog-js").default | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize PostHog analytics.
 * Only loads when online, fails silently if initialization fails.
 * Safe to call multiple times - will only initialize once.
 */
export async function initAnalytics(): Promise<void> {
  // Don't initialize if offline
  if (!canUseWebContainer()) return;

  // Return existing promise if already initializing/initialized
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const posthog = (await import("posthog-js")).default;
      posthog.init("phc_VMwEOxE6mJSMfPLJY7RZkIvTurjCtAJBBzofSZQzAcm", {
        api_host: "https://us.i.posthog.com",
        defaults: "2025-11-30",
      });
      posthogInstance = posthog;
    } catch (e) {
      console.warn("[Analytics] Failed to initialize:", e);
    }
  })();

  return initPromise;
}

/**
 * Track an analytics event.
 * Fails silently if PostHog is not initialized or capture fails.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    posthogInstance?.capture(event, properties);
  } catch {
    // Fail silently - analytics should never break the app
  }
}
