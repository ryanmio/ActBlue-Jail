/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { detectPII } from "@/server/ai/redact-pii";

/**
 * Redact PII from submission text fields.
 * Runs as a separate step after classification/sender extraction.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json(
        { error: "submissionId required" },
        { status: 400 }
      );
    }

    console.log("redact-pii:start", { submissionId });

    const supabase = getSupabaseServer();

    // Load submission data
    const { data: items, error: fetchError } = await supabase
      .from("submissions")
      .select("id, raw_text, email_body, email_subject, email_from")
      .eq("id", submissionId)
      .limit(1);

    if (fetchError || !items?.[0]) {
      console.error("redact-pii:not_found", { submissionId, error: fetchError });
      return NextResponse.json(
        { error: "submission not found" },
        { status: 404 }
      );
    }

    const submission = items[0] as {
      id: string;
      raw_text?: string | null;
      email_body?: string | null;
      email_subject?: string | null;
      email_from?: string | null;
    };

    // Detect PII using AI
    const piiResult = await detectPII(
      submission.raw_text || "",
      submission.email_from
    );

    console.log("redact-pii:detected", {
      submissionId,
      hasName: !!piiResult.name,
      hasEmail: !!piiResult.email,
      confidence: piiResult.confidence,
    });

    // If no PII detected or low confidence, skip redaction
    if ((!piiResult.name && !piiResult.email) || piiResult.confidence < 0.5) {
      console.log("redact-pii:skipped", {
        submissionId,
        reason: "no_pii_or_low_confidence",
        confidence: piiResult.confidence,
      });
      return NextResponse.json({
        ok: true,
        redacted: false,
        reason: "no_pii_detected",
        confidence: piiResult.confidence,
      });
    }

    // Perform redaction on text fields
    const updates: Record<string, string | null> = {};

    if (submission.raw_text) {
      let redactedText = submission.raw_text;
      
      if (piiResult.name) {
        const nameAsterisks = "*".repeat(piiResult.name.length);
        redactedText = redactedText.split(piiResult.name).join(nameAsterisks);
      }
      
      if (piiResult.email) {
        const emailAsterisks = "*".repeat(piiResult.email.length);
        redactedText = redactedText.split(piiResult.email).join(emailAsterisks);
      }
      
      updates.raw_text = redactedText;
    }

    if (submission.email_body) {
      let redactedBody = submission.email_body;
      
      if (piiResult.name) {
        const nameAsterisks = "*".repeat(piiResult.name.length);
        redactedBody = redactedBody.split(piiResult.name).join(nameAsterisks);
      }
      
      if (piiResult.email) {
        const emailAsterisks = "*".repeat(piiResult.email.length);
        redactedBody = redactedBody.split(piiResult.email).join(emailAsterisks);
      }
      
      updates.email_body = redactedBody;
    }

    if (submission.email_subject) {
      let redactedSubject = submission.email_subject;
      
      if (piiResult.name) {
        const nameAsterisks = "*".repeat(piiResult.name.length);
        redactedSubject = redactedSubject.split(piiResult.name).join(nameAsterisks);
      }
      
      if (piiResult.email) {
        const emailAsterisks = "*".repeat(piiResult.email.length);
        redactedSubject = redactedSubject.split(piiResult.email).join(emailAsterisks);
      }
      
      updates.email_subject = redactedSubject;
    }

    // Update database with redacted text
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("submissions")
        .update(updates)
        .eq("id", submissionId);

      if (updateError) {
        console.error("redact-pii:update_failed", {
          submissionId,
          error: updateError,
        });
        return NextResponse.json(
          { error: "database update failed" },
          { status: 500 }
        );
      }

      console.log("redact-pii:success", {
        submissionId,
        fieldsUpdated: Object.keys(updates),
        name: piiResult.name,
        email: piiResult.email,
      });

      return NextResponse.json({
        ok: true,
        redacted: true,
        fieldsUpdated: Object.keys(updates),
        confidence: piiResult.confidence,
      });
    }

    console.log("redact-pii:no_updates", { submissionId });
    return NextResponse.json({
      ok: true,
      redacted: false,
      reason: "no_text_fields",
    });
  } catch (error) {
    console.error("redact-pii:error", { error: String(error) });
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

