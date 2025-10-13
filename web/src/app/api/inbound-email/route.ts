import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { ingestTextSubmission, triggerPipelines } from "@/server/ingest/save";
import { cleanTextForAI } from "@/server/ingest/text-cleaner";
import { sanitizeEmailHtml } from "@/server/ingest/html-sanitizer";

// Mailgun sends POST with application/x-www-form-urlencoded by default
export async function POST(req: NextRequest) {
  try {
    console.log("/api/inbound-email:start", {
      ct: req.headers.get("content-type") || null,
    });
    
    const contentType = req.headers.get("content-type") || "";
    let sender = "";
    let subject = "";
    let bodyPlain = "";
    let bodyHtml = "";

    // Parse Mailgun webhook payload
    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Read raw body as UTF-8 and manually parse to ensure proper encoding
      const rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      sender = params.get("sender") || params.get("from") || params.get("From") || "";
      subject = params.get("subject") || params.get("Subject") || "";
      bodyPlain = params.get("body-plain") || params.get("stripped-text") || params.get("text") || "";
      bodyHtml = params.get("body-html") || params.get("stripped-html") || params.get("html") || "";
    } else if (contentType.includes("multipart/form-data")) {
      // Use formData for multipart (handles binary attachments correctly)
      const form = await req.formData();
      sender = String(form.get("sender") || form.get("from") || form.get("From") || "");
      subject = String(form.get("subject") || form.get("Subject") || "");
      bodyPlain = String(form.get("body-plain") || form.get("stripped-text") || form.get("text") || "");
      bodyHtml = String(form.get("body-html") || form.get("stripped-html") || form.get("html") || "");
    } else if (contentType.includes("application/json")) {
      const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      sender = String(json?.sender || json?.from || json?.From || "");
      subject = String(json?.subject || json?.Subject || "");
      bodyPlain = String(json?.["body-plain"] || json?.["stripped-text"] || json?.text || "");
      bodyHtml = String(json?.["body-html"] || json?.["stripped-html"] || json?.html || "");
    } else {
      // Best-effort: try reading as text and parsing as URLSearchParams
      const rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      sender = params.get("sender") || params.get("from") || params.get("From") || "";
      subject = params.get("subject") || params.get("Subject") || "";
      bodyPlain = params.get("body-plain") || params.get("stripped-text") || params.get("text") || "";
      bodyHtml = params.get("body-html") || params.get("stripped-html") || params.get("html") || "";
    }

    // Store envelope sender (forwarder's email) for reply feature
    const envelopeSender = sender;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("/api/inbound-email:error service_key_missing");
      return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
    }

    // Use plain text for classification, HTML for display
    let rawText = bodyPlain || stripHtml(bodyHtml);

    // Determine if this appears to be a forwarded email
    const isForwarded = detectForwardedEmail(subject || "", rawText, bodyHtml || "");

    // IMPORTANT: Extract original From line BEFORE stripping forwarded headers
    // Try from body-plain first; if missing, try from stripped HTML
    let originalFromLine = extractOriginalFromLine(rawText);
    if (!originalFromLine && bodyHtml) {
      const htmlAsText = stripHtml(bodyHtml);
      originalFromLine = extractOriginalFromLine(htmlAsText);
    }

    // Fallback: Only if NOT a forwarded email, use the envelope sender
    // For forwarded emails, we must not set email_from to the forwarder's address
    if (!originalFromLine && sender && !isForwarded) {
      originalFromLine = sender;
    }
    
    // Strip only the forwarded separator line(s), keep From/Date/Subject/To metadata intact
    // We remove the visual divider but preserve the subsequent headers for AI and storage
    rawText = rawText
      .replace(/^[\s>]*-+\s*Forwarded message\s*-+\s*(?:\r?\n)+/im, "")
      .replace(/^[\s>]*-+\s*Forwarded message\s*-+\s*$/gim, "");
    
    // Redact honeytrap email address everywhere (democratdonor@gmail.com)
    const HONEYTRAP_EMAIL = "democratdonor@gmail.com";
    const redactHoneytrap = (text: string) => text.replace(new RegExp(HONEYTRAP_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '*******@*******.com');
    rawText = redactHoneytrap(rawText);
    
    // Clean text for AI (removes tracking links, invisible chars, excessive whitespace)
    // Note: cleanTextForAI also strips forwarded message headers
    const cleanedText = cleanTextForAI(rawText);
    
    // IMPORTANT: Keep original HTML for URL extraction (before sanitization removes tracking links)
    const originalHtml = bodyHtml;
    
    // Log HTML extraction metrics for debugging
    if (originalHtml) {
      const hrefPattern = /href=["']([^"']+)["']/gi;
      const hrefMatches = Array.from(originalHtml.matchAll(hrefPattern));
      console.log("/api/inbound-email:html_extraction", {
        originalHtmlLength: originalHtml.length,
        hrefCount: hrefMatches.length,
        sampleHrefs: hrefMatches.slice(0, 5).map(m => m[1])
      });
    }
    
    // Sanitize HTML body (remove non-ActBlue links to protect honeytrap email)
    let sanitizedHtml = bodyHtml ? sanitizeEmailHtml(bodyHtml) : null;
    
    // Also strip forwarded header and redact honeytrap from HTML
    if (sanitizedHtml) {
      sanitizedHtml = sanitizedHtml
        .replace(/^[\s>]*-+\s*Forwarded message\s*-+\s*(?:<br\s*\/?\s*>|\r?\n)+/im, "")
        .replace(/^[\s>]*-+\s*Forwarded message\s*-+\s*(?:<br\s*\/?\s*>)?$/gim, "");
      sanitizedHtml = redactHoneytrap(sanitizedHtml);
    }
    
    // Attempt to detect original sender email (for sender_id): prefer parsed from originalFromLine, then from body, else envelope
    const detectedSender =
      parseEmailAddress(originalFromLine || undefined) ||
      extractOriginalSender(rawText) ||
      parseEmailAddress(sender) ||
      sender;

    // Generate secure token for one-time report submission via email
    const submissionToken = randomBytes(32).toString("base64url");

    // Insert into Supabase (with duplicate detection inside ingestTextSubmission)
    // Use cleaned text for heuristics and AI, but store raw text for reference
    const result = await ingestTextSubmission({
      text: cleanedText || "",
      rawText: rawText || "", // Store original for audit
      senderId: detectedSender || null,
      messageType: "email",
      imageUrlPlaceholder: "email://no-image",
      emailSubject: subject || null,
      emailBody: sanitizedHtml || null, // Sanitized HTML (no tracking/unsubscribe links) for display
      emailBodyOriginal: originalHtml || null, // Original HTML for URL extraction
      emailFrom: originalFromLine || null, // Full original "From:" line (prefer original content; not the forwarder)
      forwarderEmail: parseEmailAddress(envelopeSender) || envelopeSender || null, // Bare email of forwarder
      submissionToken: submissionToken, // Secure token for email submission
    });
    
    console.log("/api/inbound-email:ingested", {
      ok: result.ok,
      id: result.id || null,
      from: detectedSender || null,
      fromLine: originalFromLine || null,
      subject: subject ? subject.slice(0, 50) : null,
      rawLen: rawText ? rawText.length : 0,
      cleanedLen: cleanedText ? cleanedText.length : 0,
      isFundraising: result.isFundraising ?? null,
      heuristic: result.heuristic || null,
    });
    
    if (!result.ok) {
      if (result.error === "duplicate") {
        console.log("/api/inbound-email:duplicate", { 
          existingId: result.id || null, 
          from: detectedSender || null 
        });
        return NextResponse.json({ ok: true, duplicate: true, id: result.id }, { status: 200 });
      }
      if (!result.id) {
        console.error("/api/inbound-email:ingest_failed", result);
        return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
      }
    }

    // For fundraising, trigger async pipelines (classify + sender extraction)
    if (result.isFundraising && result.id) {
      console.log("/api/inbound-email:triggering_pipelines", { 
        submissionId: result.id,
        hasLandingUrl: !!result.landingUrl,
        timestamp: new Date().toISOString()
      });
      
      // Always trigger classify and sender immediately
      const pipelinesStart = Date.now();
      await triggerPipelines(result.id);
      const pipelinesElapsed = Date.now() - pipelinesStart;
      console.log("/api/inbound-email:pipelines_completed", { 
        submissionId: result.id,
        elapsedMs: pipelinesElapsed
      });
      
      // If ActBlue landing URL detected, trigger screenshot (which will re-classify with landing context)
      if (result.landingUrl) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || "";
        console.log("/api/inbound-email:triggering_screenshot", {
          submissionId: result.id,
          url: result.landingUrl
        });
        void fetch(`${base}/api/screenshot-actblue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: result.id, url: result.landingUrl }),
        }).then(async (r) => {
          const text = await r.text().catch(() => "");
          console.log("/api/inbound-email:screenshot_triggered", { 
            status: r.status, 
            caseId: result.id,
            url: result.landingUrl,
            response: text?.slice(0, 200) 
          });
        }).catch((e) => {
          console.error("/api/inbound-email:screenshot_error", { 
            submissionId: result.id,
            error: String(e)
          });
        });
      }
    } else {
      console.log("/api/inbound-email:skipped_triggers_non_fundraising", { 
        submissionId: result.id,
        isFundraising: result.isFundraising
      });
    }

    return NextResponse.json({ ok: true, id: result.id }, { status: 200 });
  } catch (e) {
    console.error("/api/inbound-email:exception", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// Strip HTML tags to get plain text
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Detect if an email appears to be a forward based on subject/body/html markers
function detectForwardedEmail(subject: string, bodyText: string, bodyHtml: string): boolean {
  const subj = subject.toLowerCase();
  if (subj.startsWith("fwd:") || subj.includes("fw:")) return true;
  const textHasForward = /forwarded message|begin forwarded message/i.test(bodyText);
  const htmlHasForward = /forwarded message|begin forwarded message/i.test(bodyHtml);
  return textHasForward || htmlHasForward;
}

// Attempt to extract original sender email from forwarded email body
// Returns just the email address for sender_id
function extractOriginalSender(text: string): string | null {
  const lines = text.split("\n");
  for (const line of lines.slice(0, 50)) { // Check first 50 lines
    // Match patterns like:
    // From: sender@example.com
    // From: "Name" <sender@example.com>
    const match = line.match(/^From:\s*(?:"[^"]*"\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Extract the full original "From:" line from forwarded email (for AB009 detection)
// Returns the complete From line including display name
// Example: "NEW ActBlue Update (via dccc@dccc.org) <dccc@ak.dccc.org>"
function extractOriginalFromLine(text: string): string | null {
  const lines = text.split(/\r?\n/).map(line => line.replace(/^[\s>]+/, "")); // Normalize: strip quotes/whitespace
  
  // Find forwarded message boundary (Gmail, Apple Mail, Outlook all use similar patterns)
  const forwardMarkers = [
    /^-+\s*Forwarded message\s*-+/i,     // Gmail: "---------- Forwarded message ---------"
    /^Begin forwarded message:/i,         // Apple Mail
    /^From:\s+.+@.+/i                     // Outlook (starts with From: line directly)
  ];
  
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const isForwardBoundary = forwardMarkers.some(marker => marker.test(lines[i]));
    
    if (isForwardBoundary) {
      // Search next 20 lines for From: header
      const searchEnd = Math.min(i + 20, lines.length);
      for (let j = i; j < searchEnd; j++) {
        const match = lines[j].match(/^From:\s+(.+)$/i);
        if (match) {
          return validateAndCleanFromLine(match[1]);
        }
        // Stop at empty line (end of header block)
        if (lines[j].trim() === "" && j > i) break;
      }
    }
  }
  
  return null;
}

// Validate and clean extracted From line
function validateAndCleanFromLine(fromLine: string): string | null {
  const cleaned = fromLine.trim();
  
  // Must be valid: has email, not honeytrap, reasonable length
  if (cleaned.includes("@") && 
      !cleaned.toLowerCase().includes("democratdonor@gmail.com") && 
      cleaned.length > 5) {
    return cleaned;
  }
  
  return null;
}

// Parse a bare email address from formats like:
// - Name <email@example.com>
// - "Name" <email@example.com>
// - email@example.com
function parseEmailAddress(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1] : null;
}

