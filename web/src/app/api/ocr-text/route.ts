import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();

  let body: unknown = null;
  try {
    body = await req.json();
  } catch (e) {
    console.error("/api/ocr-text: invalid JSON", e);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const submissionId = typeof b?.submissionId === "string" ? (b.submissionId as string) : undefined;
  const text = typeof b?.text === "string" ? (b.text as string) : undefined;
  const conf = typeof b?.conf === "number" ? (b.conf as number) : undefined;
  const ms = typeof b?.ms === "number" ? (b.ms as number) : undefined;

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.length > 10);
  console.log("/api/ocr-text:start", {
    submissionId,
    textLength: typeof text === "string" ? text.length : null,
    conf,
    ms,
    hasServiceRole,
  });

  if (!submissionId || typeof text !== "string") {
    console.error("/api/ocr-text: missing_args", { submissionIdOk: Boolean(submissionId), textType: typeof text });
    return NextResponse.json({ error: "missing_args" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("submissions")
      .update({ raw_text: text, ocr_method: "browser", ocr_confidence: conf ?? null, ocr_ms: ms ?? null, processing_status: "ocr" })
      .eq("id", submissionId);

    if (error) {
      console.error("/api/ocr-text:update_failed", { message: error.message });
      return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
    }

    console.log("/api/ocr-text:updated", { submissionId });
  } catch (e) {
    console.error("/api/ocr-text:exception", e);
    return NextResponse.json({ error: "exception", detail: String(e) }, { status: 500 });
  }

  try {
    console.log("/api/ocr-text:trigger_classify", { submissionId });
    void fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  } catch (e) {
    console.warn("/api/ocr-text:trigger_failed", String(e));
  }

  return NextResponse.json({ ok: true });
}
