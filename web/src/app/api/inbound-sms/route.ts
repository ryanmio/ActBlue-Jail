/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ingestTextSubmission } from "@/server/ingest/save";

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
      console.error("/api/inbound-sms:error service_key_missing");
      return xmlResponse(`<Response></Response>`, 400);
    }

    // Insert into Supabase
    const result = await ingestTextSubmission({
      text: bodyText || "",
      senderId: fromNumber || null,
      messageType: "sms",
      imageUrlPlaceholder: "sms://no-image",
    });
    console.log("/api/inbound-sms:ingested", {
      ok: result.ok,
      id: result.id || null,
      from: fromNumber || null,
      bodyLen: bodyText ? bodyText.length : 0,
      isFundraising: result.isFundraising ?? null,
      heuristic: result.heuristic || null,
    });
    if (!result.ok || !result.id) {
      console.error("/api/inbound-sms:ingest_failed", result);
      return xmlResponse(`<Response></Response>`, 500);
    }

    // For fundraising messages, synchronously trigger classify/sender with a short timeout
    if (result.isFundraising) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || "";
      async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | { timeout: true }> {
        return Promise.race([
          p,
          new Promise<{ timeout: true }>((resolve) => setTimeout(() => resolve({ timeout: true }), ms)),
        ]);
      }

      const classifyPromise = fetch(`${base}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: result.id }),
      }).then(async (r) => ({ status: r.status, text: await r.text().catch(() => "") }))
        .catch((e) => ({ status: 0, text: String(e) }));

      const senderPromise = fetch(`${base}/api/sender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: result.id }),
      }).then(async (r) => ({ status: r.status, text: await r.text().catch(() => "") }))
        .catch((e) => ({ status: 0, text: String(e) }));

      const [classifyRes, senderRes] = await Promise.all([
        withTimeout(classifyPromise, 14000),
        withTimeout(senderPromise, 14000),
      ]);
      console.log("/api/inbound-sms:triggered", { submissionId: result.id, classifyRes, senderRes });
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


