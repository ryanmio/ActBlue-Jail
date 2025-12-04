/**
 * Shared constants for AI processing.
 */

/**
 * Maximum character limit for text sent to AI models.
 * 
 * Based on analysis of production data (Dec 2024):
 * - 99th percentile: ~6,000 chars
 * - Max (excluding outliers): ~6,500 chars
 * - 8,000 provides headroom while controlling costs
 * 
 * This limit should rarely be hit in normal usage.
 */
export const AI_TEXT_CHAR_LIMIT = 8_000;

/**
 * Truncate text to the AI character limit.
 * Adds a truncation notice if the text was shortened.
 */
export function truncateForAI(text: string): string {
  if (text.length <= AI_TEXT_CHAR_LIMIT) {
    return text;
  }
  const truncated = text.slice(0, AI_TEXT_CHAR_LIMIT);
  return truncated + "\n\n[TEXT TRUNCATED - original exceeded character limit]";
}

