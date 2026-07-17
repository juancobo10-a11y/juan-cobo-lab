/**
 * portConfig.ts — Pure port and base-path resolution (S-016)
 *
 * Centralises the mapping from environment variables to server configuration
 * values.  All functions are pure and throw-free — they fall back to safe
 * defaults so that `vite build` and the test runner can execute in any
 * environment without requiring PORT or BASE_PATH to be set.
 *
 * Testable independently of Vite.
 */

export const DEFAULT_PORT = 5000;
export const DEFAULT_BASE_PATH = "/";
export const PORT_MAX = 65535;

/**
 * Resolves the server port from a raw environment-variable string.
 *
 * Rules:
 *  - Absent or blank  → DEFAULT_PORT
 *  - Non-numeric      → DEFAULT_PORT (documented fallback, not an error)
 *  - Out of range     → DEFAULT_PORT
 *  - Valid integer    → that integer
 */
export function resolvePort(rawPort: string | undefined): number {
  if (!rawPort || !rawPort.trim()) return DEFAULT_PORT;
  const n = Number(rawPort.trim());
  if (!Number.isFinite(n) || n <= 0 || n > PORT_MAX || !Number.isInteger(n)) {
    return DEFAULT_PORT;
  }
  return n;
}

/**
 * Resolves the Vite base path from a raw environment-variable string.
 * Falls back to "/" if the value is absent or blank.
 */
export function resolveBasePath(rawPath: string | undefined): string {
  if (!rawPath || !rawPath.trim()) return DEFAULT_BASE_PATH;
  return rawPath.trim();
}
