/**
 * Offline detection utilities
 */

export interface OfflineStatus {
  isOffline: boolean;
  canUseWebContainer: boolean;
}

/**
 * Check if the application is currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Check if WebContainer can be used (requires online)
 */
export function canUseWebContainer(): boolean {
  return navigator.onLine;
}

/**
 * Get the current offline status
 */
export function getOfflineStatus(): OfflineStatus {
  const offline = isOffline();
  return {
    isOffline: offline,
    canUseWebContainer: !offline,
  };
}

/**
 * Listen for online/offline status changes
 */
export function onOfflineStatusChange(callback: (status: OfflineStatus) => void): () => void {
  const handler = () => {
    callback(getOfflineStatus());
  };

  window.addEventListener('online', handler);
  window.addEventListener('offline', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', handler);
  };
}
