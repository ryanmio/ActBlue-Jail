import { NextRequest, NextResponse } from "next/server";
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
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
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
      // Best-effort: try formData anyway
      const form = await req.formData();
      sender = String(form.get("sender") || form.get("from") || form.get("From") || "");
      subject = String(form.get("subject") || form.get("Subject") || "");
      bodyPlain = String(form.get("body-plain") || form.get("stripped-text") || form.get("text") || "");
      bodyHtml = String(form.get("body-html") || form.get("stripped-html") || form.get("html") || "");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("/api/inbound-email:error service_key_missing");
      return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
    }

    // Use plain text for classification, HTML for display
    const rawText = bodyPlain || stripHtml(bodyHtml);
    
    // Clean text for AI (removes tracking links, invisible chars, excessive whitespace)
    // Note: cleanTextForAI also strips forwarded message headers
    const cleanedText = cleanTextForAI(rawText);
    
    // Sanitize HTML body (remove non-ActBlue links to protect honeytrap email)
    const sanitizedHtml = bodyHtml ? sanitizeEmailHtml(bodyHtml) : null;
    
    // Attempt to detect original sender from forwarded emails (use raw text)
    // Best-effort: look for "From:" lines in body, otherwise use envelope sender
    const detectedSender = extractOriginalSender(rawText) || sender;

    // Insert into Supabase (with duplicate detection inside ingestTextSubmission)
    // Use cleaned text for heuristics and AI, but store raw text for reference
    const result = await ingestTextSubmission({
      text: cleanedText || "",
      rawText: rawText || "", // Store original for audit
      senderId: detectedSender || null,
      messageType: "email",
      imageUrlPlaceholder: "email://no-image",
      emailSubject: subject || null,
      emailBody: sanitizedHtml || null, // Sanitized HTML (no tracking/unsubscribe links)
    });
    
    console.log("/api/inbound-email:ingested", {
      ok: result.ok,
      id: result.id || null,
      from: detectedSender || null,
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
      // Always trigger classify and sender immediately
      await triggerPipelines(result.id);
      console.log("/api/inbound-email:triggered_pipelines", { submissionId: result.id });
      
      // If ActBlue landing URL detected, trigger screenshot (which will re-classify with landing context)
      if (result.landingUrl) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || "";
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
          console.error("/api/inbound-email:screenshot_error", String(e));
        });
      }
    } else {
      console.log("/api/inbound-email:skipped_triggers_non_fundraising", { submissionId: result.id });
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

// Attempt to extract original sender from forwarded email body
// Looks for common forwarding patterns like "From: sender@example.com"
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

