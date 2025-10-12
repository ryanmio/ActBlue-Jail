import { NextRequest, NextResponse } from "next/server";
import { ingestTextSubmission, triggerPipelines } from "@/server/ingest/save";

// Twilio will POST with application/x-www-form-urlencoded by default
export async function POST(req: NextRequest) {
  // Twilio expects a 200 with TwiML (or empty <Response/>)
  try {
    console.log("/api/inbound-sms:start", {
      ct: req.headers.get("content-type") || null,
      twilioSig: req.headers.get("x-twilio-signature") || null,
    });
    const contentType = req.headers.get("content-type") || "";
    let bodyText = "";
    let fromNumber = "";
    let mediaUrls: Array<{ url: string; contentType?: string }> = [];

    if (contentType.includes("application/x-www-form-urlencoded")) {
      // Read raw body as UTF-8 and manually parse to ensure proper encoding
      const rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      bodyText = params.get("Body") || "";
      fromNumber = params.get("From") || "";
      
      // Parse media attachments (MMS)
      const numMedia = parseInt(params.get("NumMedia") || "0", 10);
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = params.get(`MediaUrl${i}`);
        const mediaContentType = params.get(`MediaContentType${i}`);
        if (mediaUrl) {
          mediaUrls.push({
            url: mediaUrl,
            contentType: mediaContentType || undefined,
          });
        }
      }
    } else if (contentType.includes("application/json")) {
      const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      bodyText = String(json?.Body || json?.body || "");
      fromNumber = String(json?.From || json?.from || "");
      
      // Parse media attachments (MMS)
      const numMedia = parseInt(String(json?.NumMedia || "0"), 10);
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = String(json?.[`MediaUrl${i}`] || "");
        const mediaContentType = String(json?.[`MediaContentType${i}`] || "");
        if (mediaUrl) {
          mediaUrls.push({
            url: mediaUrl,
            contentType: mediaContentType || undefined,
          });
        }
      }
    } else {
      // Best-effort: try reading as text and parsing as URLSearchParams
      const rawBody = await req.text();
      const params = new URLSearchParams(rawBody);
      bodyText = params.get("Body") || "";
      fromNumber = params.get("From") || "";
      
      // Parse media attachments (MMS)
      const numMedia = parseInt(params.get("NumMedia") || "0", 10);
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = params.get(`MediaUrl${i}`);
        const mediaContentType = params.get(`MediaContentType${i}`);
        if (mediaUrl) {
          mediaUrls.push({
            url: mediaUrl,
            contentType: mediaContentType || undefined,
          });
        }
      }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("/api/inbound-sms:error service_key_missing");
      return xmlResponse(`<Response></Response>`, 400);
    }

    // Insert into Supabase (with duplicate detection inside ingestTextSubmission)
    const result = await ingestTextSubmission({
      text: bodyText || "",
      senderId: fromNumber || null,
      messageType: "sms",
      imageUrlPlaceholder: "sms://no-image",
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
    console.log("/api/inbound-sms:ingested", {
      ok: result.ok,
      id: result.id || null,
      from: fromNumber || null,
      bodyLen: bodyText ? bodyText.length : 0,
      numMedia: mediaUrls.length,
      mediaContentTypes: mediaUrls.map(m => m.contentType).filter(Boolean),
      isFundraising: result.isFundraising ?? null,
      heuristic: result.heuristic || null,
    });
    if (!result.ok) {
      if (result.error === "duplicate") {
        console.log("/api/inbound-sms:duplicate", { existingId: result.id || null, from: fromNumber || null });
        return xmlResponse(`<Response></Response>`, 200);
      }
      if (!result.id) {
      console.error("/api/inbound-sms:ingest_failed", result);
      return xmlResponse(`<Response></Response>`, 500);
      }
    }

    // For fundraising, trigger async pipelines (classify + sender extraction)
    // IMPORTANT: Don't await pipelines - Twilio has 15s timeout, pipelines can take 20s+
    // Return 200 immediately to Twilio, let pipelines run in background
    if (result.isFundraising && result.id) {
      console.log("/api/inbound-sms:triggering_pipelines", { 
        submissionId: result.id,
        hasLandingUrl: !!result.landingUrl
      });
      
      // Fire and forget - don't await
      void triggerPipelines(result.id).catch((e) => {
        console.error("/api/inbound-sms:pipelines_error", { 
          submissionId: result.id, 
          error: String(e) 
        });
      });
      
      // If ActBlue landing URL detected, trigger screenshot (which will re-classify with landing context)
      if (result.landingUrl) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || "";
        void fetch(`${base}/api/screenshot-actblue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caseId: result.id, url: result.landingUrl }),
        }).then(async (r) => {
          const text = await r.text().catch(() => "");
          console.log("/api/inbound-sms:screenshot_triggered", { 
            status: r.status, 
            caseId: result.id,
            url: result.landingUrl,
            response: text?.slice(0, 200) 
          });
        }).catch((e) => {
          console.error("/api/inbound-sms:screenshot_error", { 
            submissionId: result.id,
            error: String(e) 
          });
        });
      }
    } else {
      console.log("/api/inbound-sms:skipped_triggers_non_fundraising", { submissionId: result.id });
    }

    // Twilio compatible empty response
    return xmlResponse(`<Response></Response>`, 200);
  } catch (e) {
    console.error("/api/inbound-sms:exception", e);
    return xmlResponse(`<Response></Response>`, 500);
  }
}

function xmlResponse(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}


