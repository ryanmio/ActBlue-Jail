/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_VISION || "gpt-4o-mini";
  if (!apiKey) return NextResponse.json({ error: "openai_key_missing" }, { status: 400 });

  const supabase = getSupabaseServer();
  const body = await req.json().catch(() => null);
  const submissionId: string | undefined = body?.submissionId;
  if (!submissionId) return NextResponse.json({ error: "missing_args" }, { status: 400 });

  const start = Date.now();
  const { data: items, error } = await supabase
    .from("submissions")
    .select("id, image_url, raw_text")
    .eq("id", submissionId)
    .limit(1);
  if (error || !items?.[0]) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const sub = items[0];

  // Sign the image for the model if possible
  function parse(u?: string | null) {
    if (!u || !u.startsWith("supabase://")) return null;
    const rest = u.replace("supabase://", "");
    const [bucket, ...pathParts] = rest.split("/");
    return { bucket, path: pathParts.join("/") };
  }
  let signedUrl: string | null = null;
  const parsed = parse(sub.image_url);
  if (parsed) {
    const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
    signedUrl = signed?.signedUrl || null;
  }

  const system = "You are a compliance assistant. Given OCR text and an optional image, identify potential ActBlue policy violations. Return strict JSON only.";

  type Message = { role: "system"|"user"; content: any };
  const messages: Message[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "text", text: `OCR text:\n${sub.raw_text || "(none)"}\n\nReturn JSON with fields: violations, summary, overall_confidence.` },
      ],
    },
  ];
  if (signedUrl) {
    (messages[1].content as Array<{type:string; image_url?: any; text?: string}>).push({ type: "image_url", image_url: { url: signedUrl } });
  }

  let json: unknown;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages }),
    });
    json = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: "openai_failed", detail: json }, { status: 502 });
  } catch (e) {
    return NextResponse.json({ error: "openai_failed" }, { status: 500 });
  }

  const content = (json as any)?.choices?.[0]?.message?.content?.trim() || "{}";
  let parsedOut: Record<string, unknown> = {};
  try { parsedOut = JSON.parse(content); } catch {}
  const violations = Array.isArray((parsedOut as any).violations) ? (parsedOut as any).violations as Array<any> : [];

  if (violations.length > 0) {
    const rows = violations.map((v: Record<string, unknown>) => ({
      submission_id: submissionId,
      code: String(v.code ?? ""),
      title: String(v.title ?? ""),
      description: String((v as any).rationale ?? ""),
      evidence_spans: (v as any).evidence_spans ?? null,
      severity: Number((v as any).severity ?? 1),
      confidence: Number((v as any).confidence ?? (parsedOut as any).overall_confidence ?? 0.5),
    }));
    await supabase.from("violations").insert(rows);
  }

  const ms = Date.now() - start;
  await supabase
    .from("submissions")
    .update({ processing_status: "done", classifier_ms: ms, ai_version: model, ai_confidence: (parsedOut as any).overall_confidence ?? null })
    .eq("id", submissionId);

  return NextResponse.json({ ok: true, violations: violations.length, ms });
}
