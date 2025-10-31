/**
 * Idle prefetching utilities for offline support
 * Prefetches commonly used chunks during browser idle time
 */

import type { LazyModules } from "./lazy-imports";

/**
 * Prefetch commonly used library chunks during idle time
 * This ensures they're cached for offline use even if not yet used
 */
export function schedulePrefetch(modules: LazyModules): void {
  // Only prefetch when online
  if (!navigator.onLine) {
    console.log("[Prefetch] Skipping - offline");
    return;
  }

  // Only prefetch if service worker is active (for caching)
  if (!navigator.serviceWorker?.controller) {
    console.log("[Prefetch] Skipping - no service worker");
    return;
  }

  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleIdle = (callback: () => void) => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(callback, { timeout: 5000 });
    } else {
      setTimeout(callback, 1000);
    }
  };

  console.log("[Prefetch] Scheduling chunk prefetch during idle time");

  // Prefetch lezer parsers (highest value - 17 chunks, relatively small)
  scheduleIdle(async () => {
    try {
      console.log("[Prefetch] Loading lezer parsers...");
      await modules.loadLezer();
      console.log("[Prefetch] Lezer parsers cached");
    } catch (error) {
      console.warn("[Prefetch] Failed to prefetch lezer:", error);
    }
  });

  // Prefetch shiki (medium priority, single chunk)
  scheduleIdle(async () => {
    try {
      console.log("[Prefetch] Loading shiki...");
      await modules.loadShiki();
      console.log("[Prefetch] Shiki cached");
    } catch (error) {
      console.warn("[Prefetch] Failed to prefetch shiki:", error);
    }
  });

  // Prefetch ShikiHighlighter (local module)
  scheduleIdle(async () => {
    try {
      console.log("[Prefetch] Loading ShikiHighlighter...");
      await modules.loadShikiHighlighter();
      console.log("[Prefetch] ShikiHighlighter cached");
    } catch (error) {
      console.warn("[Prefetch] Failed to prefetch ShikiHighlighter:", error);
    }
  });

  // Prefetch three.js (lower priority, larger chunk)
  scheduleIdle(async () => {
    try {
      console.log("[Prefetch] Loading three.js...");
      await modules.loadThree();
      console.log("[Prefetch] Three.js cached");
    } catch (error) {
      console.warn("[Prefetch] Failed to prefetch three.js:", error);
    }
  });

  // Prefetch motion-canvas-graphing
  scheduleIdle(async () => {
    try {
      console.log("[Prefetch] Loading motion-canvas-graphing...");
      await modules.loadMotionCanvasGraphing();
      console.log("[Prefetch] Motion-canvas-graphing cached");
    } catch (error) {
      console.warn(
        "[Prefetch] Failed to prefetch motion-canvas-graphing:",
        error,
      );
    }
  });
}

/**
 * Check if prefetching is appropriate right now
 */
export function shouldPrefetch(): boolean {
  return (
    navigator.onLine &&
    !!navigator.serviceWorker?.controller &&
    // Don't prefetch on slow connections
    (!("connection" in navigator) || !(navigator as any).connection?.saveData)
  );
}
