/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ingestTextSubmission, triggerPipelines } from "@/server/ingest/save";

// Twilio will POST with application/x-www-form-urlencoded by default
export async function POST(req: NextRequest) {
  // Twilio expects a 200 with TwiML (or empty <Response/>)
  try {
    const contentType = req.headers.get("content-type") || "";
    let bodyText = "";
    let fromNumber = "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      bodyText = String(form.get("Body") || "");
      fromNumber = String(form.get("From") || "");
    } else if (contentType.includes("application/json")) {
      const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      bodyText = String(json?.Body || json?.body || "");
      fromNumber = String(json?.From || json?.from || "");
    } else {
      // Best-effort: try formData anyway
      const form = await req.formData();
      bodyText = String(form.get("Body") || "");
      fromNumber = String(form.get("From") || "");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return xmlResponse(`<Response></Response>`, 400);
    }

    // Insert into Supabase
    const result = await ingestTextSubmission({
      text: bodyText || "",
      senderId: fromNumber || null,
      messageType: "sms",
      imageUrlPlaceholder: "sms://no-image",
    });
    if (!result.ok || !result.id) {
      return xmlResponse(`<Response></Response>`, 500);
    }

    // Fire-and-forget classification + sender extraction
    triggerPipelines(result.id);

    // Twilio compatible empty response
    return xmlResponse(`<Response></Response>`, 200);
  } catch (_e) {
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


