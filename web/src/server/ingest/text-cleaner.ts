/**
 * Text cleaning utilities for AI classification
 * Reduces token usage by removing tracking links, invisible characters, and boilerplate
 */

/**
 * Clean text for AI classification
 * - Removes invisible Unicode characters (zero-width spaces, etc.)
 * - Strips non-ActBlue tracking URLs
 * - Normalizes excessive whitespace
 * - Removes unsubscribe/footer boilerplate
 */
export function cleanTextForAI(text: string): string {
  let cleaned = text;

  // Remove invisible Unicode characters (zero-width spaces, joiners, etc.)
  // These are often used for email tracking/fingerprinting
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060\u180E]/g, "");
  
  // Remove "From:" forwarding header lines (keep content after)
  cleaned = cleaned.replace(/^-+\s*Forwarded message\s*-+.*?\n(?:From:.*?\n|Date:.*?\n|Subject:.*?\n|To:.*?\n)+/gim, "");

  // Strip non-ActBlue URLs but keep ActBlue ones (base URL only, no params)
  // Match URLs and replace non-ActBlue with placeholder
  cleaned = cleaned.replace(/(https?:\/\/[^\s<>"'\)]+)/g, (url) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      
      // Keep ActBlue URLs but strip query parameters (reduce tokens)
      if (host === "actblue.com" || host.endsWith(".actblue.com")) {
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      }
      
      // Keep secure.actblue.com links (base URL only)
      if (host.includes("actblue")) {
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      }
      
      // Remove tracking/redirect URLs
      return "[LINK]";
    } catch {
      return "[LINK]";
    }
  });

  // Remove "Click here to unsubscribe" and similar boilerplate
  cleaned = cleaned.replace(/click here to (unsubscribe|receive fewer emails).*?\n/gi, "");
  cleaned = cleaned.replace(/^unsubscribe.*?$/gim, "");
  
  // Remove footer boilerplate patterns
  cleaned = cleaned.replace(/^-{5,}$/gm, ""); // Separator lines
  // Keep "Paid for by" - important for sender extraction!
  cleaned = cleaned.replace(/P\.O\. Box \d+.*?\n.*?\d{5}/gi, "");
  
  // Remove image alt text markers
  cleaned = cleaned.replace(/\[image:[^\]]+\]/gi, "");
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines
  cleaned = cleaned.replace(/[ \t]{2,}/g, " "); // Multiple spaces to single space
  cleaned = cleaned.replace(/^\s+$/gm, ""); // Empty lines with just spaces
  
  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract ActBlue URLs from text (even from redirects/tracking links)
 * Returns all ActBlue URLs found, prioritizing the one with most query params
 */
export function extractAllActBlueUrls(text: string): string[] {
  const urls: string[] = [];
  const urlPattern = /https?:\/\/[^\s<>"'\)]+/g;
  const matches = text.match(urlPattern) || [];

  for (const rawUrl of matches) {
    try {
      const cleaned = rawUrl.replace(/[.,;:)\]]+$/, "");
      const parsed = new URL(cleaned);
      const host = parsed.hostname.toLowerCase();

      // Direct ActBlue URLs
      if (host === "actblue.com" || host.endsWith(".actblue.com")) {
        urls.push(cleaned);
      }
      
      // Check if URL parameters contain encoded ActBlue links
      // Some tracking links encode the destination URL
      const fullUrl = decodeURIComponent(cleaned);
      const nestedMatch = fullUrl.match(/https?:\/\/[^&\s]*actblue\.com[^\s&]*/i);
      if (nestedMatch) {
        urls.push(nestedMatch[0]);
      }
    } catch {
      continue;
    }
  }

  return [...new Set(urls)]; // Deduplicate
}

