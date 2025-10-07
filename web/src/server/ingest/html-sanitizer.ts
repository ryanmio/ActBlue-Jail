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

  // Redact email addresses, but preserve From: emails
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const maskEmail = (email: string) => {
    try {
      const [local, domainFull] = email.split("@");
      const lastDot = domainFull.lastIndexOf(".");
      if (lastDot <= 0) return "****@****.***";
      const tld = domainFull.slice(lastDot + 1);
      return `${"*".repeat(7)}@${"*".repeat(7)}.${tld}`;
    } catch {
      return "****@****.***";
    }
  };
  
  // Strip names from To: lines and redact the email: "To: Name <email>" => "To: <*******@*******.com>"
  sanitized = sanitized.replace(/(\bTo:\s*)([^<\n]*?)(<[^>]+>)/gi, (match, prefix, name, angleEmail) => {
    const redactedEmail = angleEmail.replace(emailRegex, maskEmail);
    return `${prefix}${redactedEmail}`;
  });
  
  // Also handle To: without angle brackets: "To: name@example.com" => "To: *******@*******.com"
  sanitized = sanitized.replace(/(\bTo:\s*)([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi, (match, prefix, email) => {
    return `${prefix}${maskEmail(email)}`;
  });
  
  // Redact emails in body content (but From: is preserved by not matching it)
  // Match emails NOT preceded by "From:" to preserve sender
  sanitized = sanitized.replace(/(?<!From:\s{0,20})([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi, (match, email) => {
    // Double-check we're not in a From: line
    const beforeContext = sanitized.substring(Math.max(0, sanitized.indexOf(match) - 30), sanitized.indexOf(match));
    if (/From:\s*$/i.test(beforeContext)) {
      return match; // Keep From: emails
    }
    return maskEmail(match);
  });

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

