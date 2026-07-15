/**
 * Router thresholds — single source of truth.
 *
 * Import from here in both KnowledgeRouter and tests.
 * Never duplicate these values elsewhere.
 */
export const ROUTER_THRESHOLDS = {
  /** Minimum score to appear as a candidate at all */
  ninguna: 0.05,
  /** Below this → baja confidence → user must confirm */
  baja: 0.20,
  /** At or above this → alta confidence → auto-select */
  alta: 0.42,
  /**
   * If top-1 and top-2 are within this delta, treat as a tie
   * and let the user choose rather than picking arbitrarily.
   */
  tieDelta: 0.09,
} as const;

export type RouterThresholds = typeof ROUTER_THRESHOLDS;
