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

  const taxonomy = `Use ONLY these codes:\nAB001 Misrepresentation/Impersonation; AB002 Direct-Benefit Claim; AB003 Missing Full Entity Name; AB004 Entity Clarity (Org vs Candidate); AB005 Branding/Form Clarity; AB006 PAC Disclosure Clarity; AB007 False/Unsubstantiated Claims; AB008 Unverified Matching Program.`;

  const examples = `Example Input:\n"If we fall short of our goal, the Constitutional Amendment will be TRASHED."\nOutput:\n{"violations":[{"code":"AB007","title":"False/scare claim","rationale":"Implying fundraising goal determines constitutional outcome","evidence_span_indices":[0],"severity":3,"confidence":0.7}],"summary":"Uses misleading scare tactic","overall_confidence":0.7}`;

  const system = `You are a compliance assistant. Identify potential policy violations in political fundraising SMS/email content. ${taxonomy}\nRules:\n- Output STRICT JSON only with keys: violations (array), summary (string), overall_confidence (0..1).\n- Each violation must include: code, title, rationale, evidence_span_indices (ints), severity (1-5), confidence (0..1).\n- Emit AT MOST ONE violation per code. If multiple findings map to the same code, merge into one entry and concatenate rationales; union evidence indices.\n- AB003 (Missing Full Entity Name) ONLY if the message does not include any full entity name (e.g., 'Let America Vote'). If any full name appears anywhere, do not return AB003 just because an abbreviation exists.\n- AB006 (PAC Disclosure Clarity) ONLY if the solicitation should be from a PAC but the text fails to indicate PAC anywhere and the form/link branding suggests a PAC; do not flag if the entity name is present and does not explicitly claim to be a PAC.\n- AB007/AB008: if multiple lines contribute, still return a single entry per code.\n- If none, return {"violations":[],"summary":"No clear violations.","overall_confidence":0.3}.`;

  type Message = { role: "system"|"user"; content: any };
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: [ { type: "text", text: `OCR text:\n${sub.raw_text || "(none)"}\n\n${examples}` } ] },
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
  try { parsedOut = JSON.parse(content); } catch (e) {
    console.error("classify_parse_error", { content });
    parsedOut = { violations: [], summary: "Parse failed", overall_confidence: 0 } as any;
  }
  const violations = Array.isArray((parsedOut as any).violations) ? (parsedOut as any).violations as Array<any> : [];

  if (violations.length > 0) {
    // Deduplicate by code: keep highest confidence, merge rationales and evidence
    const byCode = new Map<string, any>();
    for (const raw of violations) {
      const code = String((raw as any).code ?? "UNKNOWN");
      const title = String((raw as any).title ?? "Unspecified violation");
      const rationale = String((raw as any).rationale ?? "");
      const confidence = Number((raw as any).confidence ?? (parsedOut as any).overall_confidence ?? 0.5);
      const severity = Math.max(1, Math.min(5, Number((raw as any).severity ?? 1)));
      const evidence_spans = Array.isArray((raw as any).evidence_span_indices) ? (raw as any).evidence_span_indices : (raw as any).evidence_spans;
      const existing = byCode.get(code);
      if (!existing || confidence > existing.confidence) {
        byCode.set(code, { code, title, rationale, confidence, severity, evidence_spans: Array.isArray(evidence_spans) ? evidence_spans.slice(0) : [] });
      } else {
        // merge
        if (rationale) existing.rationale = existing.rationale ? `${existing.rationale}; ${rationale}` : rationale;
        if (Array.isArray(evidence_spans)) existing.evidence_spans = [...(existing.evidence_spans || []), ...evidence_spans];
      }
    }
    const rows = Array.from(byCode.values()).map((v) => ({
      submission_id: submissionId,
      code: v.code,
      title: v.title,
      description: v.rationale,
      evidence_spans: v.evidence_spans ?? null,
      severity: v.severity,
      confidence: v.confidence,
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
