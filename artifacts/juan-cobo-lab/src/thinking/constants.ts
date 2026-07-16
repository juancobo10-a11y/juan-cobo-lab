/**
 * Thinking Router thresholds — single source of truth.
 *
 * Import from here in both ThinkingRouter and tests.
 * Never duplicate these values elsewhere.
 */
export const THINKING_THRESHOLDS = {
  /** Minimum score to appear as a candidate at all */
  ninguna: 0.05,
  /** Below this → baja confidence → caller must handle */
  baja: 0.20,
  /** At or above this → alta confidence → auto-select */
  alta: 0.40,
  /**
   * If top-1 and top-2 are within this delta, treat as a tie
   * rather than picking arbitrarily.
   */
  tieDelta: 0.08,
  /**
   * Guaranteed minimum score applied to universal patterns (esUniversal=true)
   * when no domain-specific pattern scored above the ninguna threshold.
   *
   * Set at baja+0.05 so universal patterns receive "media" confidence and
   * auto-select cleanly when they are the only available option, without
   * competing against specific patterns that matched on their own merit.
   */
  universalFloor: 0.25,
} as const;

export type ThinkingThresholds = typeof THINKING_THRESHOLDS;
