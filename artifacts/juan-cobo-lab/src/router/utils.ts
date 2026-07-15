/**
 * Shared text-normalization utilities.
 *
 * Used by KeywordAlgorithm (scoring) and KnowledgeRouter (cache keys).
 * Keep this file free of domain logic.
 */

/** Lowercase + strip diacritics + normalize punctuation to spaces */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡.,;:()?!"'«»\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
