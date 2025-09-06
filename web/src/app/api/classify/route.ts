/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { runClassification } from "@/server/ai/classify";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "openai_key_missing" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const submissionId: string | undefined = body?.submissionId;
  if (!submissionId) return NextResponse.json({ error: "missing_args" }, { status: 400 });

  const supabase = getSupabaseServer();
  // mark in-progress for UI polling safety
  await supabase.from("submissions").update({ processing_status: "classified" }).eq("id", submissionId);

  const result = await runClassification(submissionId, {
    includeExistingComments: false,
    replaceExisting: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, detail: (result as any).detail }, { status: result.status });
  }
  return NextResponse.json({ ok: true, violations: result.violations, ms: result.ms });
}
