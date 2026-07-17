/**
 * Thinking Engine — shared text utilities.
 *
 * Kept separate from src/router/utils.ts to avoid cross-package coupling.
 * These helpers are consumed by the Thinking Engine and by Helios.tsx.
 */

import { CONTEXT_SUMMARY_CHARS } from "./constants";

/**
 * Extracts a summary of `text` that is at most `maxChars` characters long.
 *
 * Cuts preferentially at the last sentence boundary (`.`, `?`, `!`) found
 * within the allowed range. If no sentence boundary exists in the latter 60%
 * of the range, falls back to the last word boundary, then to a hard cut.
 *
 * Replaces ad-hoc `.slice(0, 300)` calls, which risk truncating mid-word.
 *
 * @param text     Source text (e.g. pack.contexto.texto).
 * @param maxChars Maximum character count. Defaults to CONTEXT_SUMMARY_CHARS.
 * @returns        A clean, non-truncated-word summary.
 */
export function extractContextSummary(
  text: string,
  maxChars: number = CONTEXT_SUMMARY_CHARS
): string {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);

  // Prefer cutting at the last sentence-ending punctuation inside the window.
  const lastSentence = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("?"),
    truncated.lastIndexOf("!")
  );

  // Accept the sentence boundary only if it falls in the latter 60% of the
  // allowed range — avoids cutting very short at a leading sentence.
  if (lastSentence >= maxChars * 0.6) {
    return text.slice(0, lastSentence + 1).trim();
  }

  // Fall back to the last word boundary to avoid mid-word truncation.
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 0) {
    return text.slice(0, lastSpace).trim();
  }

  // Last resort: hard cut (only for pathologically dense text).
  return truncated;
}
