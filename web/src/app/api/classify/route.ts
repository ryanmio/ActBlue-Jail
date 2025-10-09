/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { runClassification } from "@/server/ai/classify";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  console.log("/api/classify:start");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("/api/classify:error service_key_missing");
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("/api/classify:error openai_key_missing");
    return NextResponse.json({ error: "openai_key_missing" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const submissionId: string | undefined = body?.submissionId;
  const includeExistingComments: boolean = Boolean(body?.includeExistingComments);
  if (!submissionId) {
    console.error("/api/classify:error missing_args", { body });
    return NextResponse.json({ error: "missing_args" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  // mark in-progress for UI polling safety
  await supabase.from("submissions").update({ processing_status: "classified" }).eq("id", submissionId);

  console.log("/api/classify:running", { submissionId });
  const result = await runClassification(submissionId, {
    includeExistingComments,
    replaceExisting: true,
  });
  if (!result.ok) {
    console.error("/api/classify:failed", { submissionId, result });
    return NextResponse.json({ error: result.error, detail: (result as any).detail }, { status: result.status });
  }
  console.log("/api/classify:done", { submissionId, violations: result.violations, ms: result.ms });
  
  // Trigger preview email for forwarded submissions (await to ensure it completes)
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    console.log("/api/classify:triggering_preview", { base, submissionId });
    const r = await fetch(`${base}/api/send-case-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    const text = await r.text().catch(() => "");
    console.log("/api/classify:preview_email_triggered", { 
      status: r.status, 
      submissionId,
      response: text?.slice(0, 500) 
    });
  } catch (e) {
    console.error("/api/classify:preview_email_error", { error: String(e), submissionId });
  }
  
  return NextResponse.json({ ok: true, violations: result.violations, ms: result.ms });
}
