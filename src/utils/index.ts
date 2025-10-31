/**
 * Formats time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Type guard to check if an element is an HTMLInputElement
 */
export function isHTMLInputElement(
  element: EventTarget | null,
): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Type guard to check if an element is an HTMLSelectElement
 */
export function isHTMLSelectElement(
  element: EventTarget | null,
): element is HTMLSelectElement {
  return element instanceof HTMLSelectElement;
}

/**
 * Validates a number input and returns the parsed value or default
 */
export function validateNumberInput(
  value: string,
  defaultValue: number,
  min?: number,
  max?: number,
): number {
  const parsed = parseInt(value);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/**
 * Validates a float input and returns the parsed value or default
 */
export function validateFloatInput(
  value: string,
  defaultValue: number,
  min?: number,
  max?: number,
): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
}

/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

/**
 * Creates a promise that resolves after the specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
