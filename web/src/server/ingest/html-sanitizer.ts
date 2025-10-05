/**
 * HTML sanitization for email bodies
 * Removes/disables non-ActBlue links to prevent honeytrap exposure
 */

/**
 * Sanitize HTML email body:
 * - Remove non-ActBlue links (unsubscribe, tracking, etc.)
 * - Keep ActBlue links functional
 * - Strip query parameters from ActBlue links
 * - Remove dangerous attributes (onclick, etc.)
 */
export function sanitizeEmailHtml(html: string): string {
  let sanitized = html;

  // Remove dangerous attributes that could execute JavaScript
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  
  // Process all <a> tags
  sanitized = sanitized.replace(/<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>(.*?)<\/a>/gi, (match, before, href, after, text) => {
    try {
      const url = new URL(href);
      const host = url.hostname.toLowerCase();
      
      // Keep ActBlue links (but strip query params)
      if (host === "actblue.com" || host.endsWith(".actblue.com")) {
        const cleanUrl = `${url.protocol}//${url.hostname}${url.pathname}`;
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      
      // Remove all other links but keep the text
      return text;
    } catch {
      // Invalid URL, just return the text
      return text;
    }
  });
  
  // Remove any remaining unsubscribe text and links
  sanitized = sanitized.replace(/click here to unsubscribe[^<]*/gi, "");
  sanitized = sanitized.replace(/<a[^>]*>unsubscribe<\/a>/gi, "");
  
  // Clean up common tracking pixel images
  sanitized = sanitized.replace(/<img[^>]*?width\s*=\s*["']1["'][^>]*?>/gi, "");
  sanitized = sanitized.replace(/<img[^>]*?height\s*=\s*["']1["'][^>]*?>/gi, "");
  
  return sanitized;
}

