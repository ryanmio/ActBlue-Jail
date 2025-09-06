/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServer } from "@/lib/supabase-server";

function parseSupabaseUrl(u?: string | null) {
  if (!u || !u.startsWith("supabase://")) return null;
  const rest = u.replace("supabase://", "");
  const [bucket, ...pathParts] = rest.split("/");
  return { bucket, path: pathParts.join("/") };
}

export type RunClassificationOptions = {
  includeExistingComments?: boolean;
  extraComments?: string[];
  replaceExisting?: boolean;
};

export async function runClassification(submissionId: string, opts: RunClassificationOptions = {}) {
  const supabase = getSupabaseServer();
  const start = Date.now();

  // Load submission
  const { data: items, error } = await supabase
    .from("submissions")
    .select("id, image_url, raw_text")
    .eq("id", submissionId)
    .limit(1);
  if (error || !items?.[0]) {
    return { ok: false, status: 404, error: "not_found" as const };
  }
  const sub = items[0] as { id: string; image_url?: string | null; raw_text?: string | null };

  // Prepare signed image URL if applicable
  let signedUrl: string | null = null;
  const parsed = parseSupabaseUrl(sub.image_url);
  if (parsed) {
    const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
    signedUrl = signed?.signedUrl || null;
  }

  // Build messages (shared across initial and reclassify)
  const system = `Role: Political Fundraising Compliance Assistant\n\nInstructions:\n- Accept OCR text and an optional screenshot image of the message. Use BOTH sources: read the text carefully and visually inspect the image when present.\n- Evaluate only for the provided 8 violation codes:\n  AB001: Misrepresentation/Impersonation\n  AB002: Direct-Benefit Claim\n  AB003: Missing Full Entity Name\n  AB004: Entity Clarity (Org vs Candidate)\n  AB005: Branding/Form Clarity\n  AB006: PAC Disclosure Clarity\n  AB007: False/Unsubstantiated Claims\n  AB008: Unverified Matching Program\n\n- Output STRICT JSON with these top-level keys, in order:\n  1. violations (array)\n  2. summary (string)\n  3. overall_confidence (float, 0–1 inclusive)\n- Each violation is returned as a single object with these keys: code (string), title (string), rationale (string), evidence_span_indices (array of integers), severity (int 1–5), confidence (float 0–1 inclusive).\n- Emit at most one violation object per code; if multiple findings, merge rationales and union indices for that code.\n\nSpecific rules and disambiguation:\n- AB001 (Misrepresentation/Impersonation):\n  - Use the screenshot image as evidence. If the image prominently features candidate(s) who are unaffiliated with the sending entity and the text does not clearly state an affiliation to those candidates, RETURN AB001.\n  - Example pattern: image contains Amy Klobuchar, Jamie Raskin, Adam Schiff; text ends with an org name like \"Let America Vote\" without clarifying affiliation — RETURN AB001.\n  - Do NOT return AB001 when the sending entity is that candidate or an affiliated campaign/committee is clearly stated. Do not flag cases where the candidate IS affiliated or when a celebrity lends their likeness (e.g., Beto sending for Powered By People; Bradley Whitford sending for a PAC).\n- AB003 (Missing Full Entity Name): Only flag when NO full entity name appears anywhere in the message. If any full entity name is present (e.g., \"Let America Vote\"), DO NOT return AB003.\n- AB006 (PAC Disclosure Clarity):\n  - AB policy: If the entity is a PAC, contribution forms must make it clear that the donation is going to the PAC (not a candidate).\n  - RETURN AB006 when the sender is a PAC/committee (or the message plausibly represents a PAC) and the copy/branding implies that donations go to a specific candidate or campaign (e.g., \"Joe Biden needs your support — donate now\") without clarifying that funds go to the PAC.\n  - If a full organization name is present but there is no claim of being a PAC and the copy does not imply funds go to a candidate, DO NOT return AB006.\n  - When debating AB001 vs AB006: prefer AB001 for image-based unaffiliated candidate usage; do NOT return AB006 in that case unless the copy additionally misdirects the destination of funds.\n- AB007 & AB008: Merge contributing lines into one object per code.\n\n- All confidence values must be floats (0–1).\n- evidence_span_indices must point to text spans; if the evidence is image-only, use an empty array and explain in the rationale (e.g., \"image shows unaffiliated candidates\").\n- If the message is malformed or incomplete, return: {\"violations\": [], \"summary\": \"Input message is malformed or incomplete.\", \"overall_confidence\": 0.1}\n- If no policy violations are found, return: {\"violations\": [], \"summary\": \"No clear violations.\", \"overall_confidence\": 0.3}\n\nOutput Format:\n- Output JSON only—no commentary or markdown.\n- Structure: { \"violations\": [ ... ], \"summary\": \"...\", \"overall_confidence\": ... }\n- Maintain the exact specified ordering of top-level keys and the strict schema.`;

  type Message = { role: "system" | "user"; content: any };
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: [ { type: "text", text: String(sub.raw_text || "").trim() || "(none)" } ] },
  ];
  if (signedUrl) {
    (messages[1].content as Array<{ type: string; image_url?: any; text?: string }>).push({ type: "image_url", image_url: { url: signedUrl } });
  }

  // Gather reviewer comments as additional context when requested
  const includeExisting = !!opts.includeExistingComments;
  const extra = Array.isArray(opts.extraComments) ? opts.extraComments : [];
  if (includeExisting || extra.length > 0) {
    const commentsList: string[] = [];
    if (includeExisting) {
      const { data: rows } = await supabase
        .from("comments")
        .select("content, created_at")
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true })
        .limit(50);
      for (const r of rows || []) {
        const c = (r as any).content as string;
        if (c && typeof c === "string") commentsList.push(c);
      }
    }
    for (const c of extra) {
      if (c && typeof c === "string") commentsList.push(c);
    }
    if (commentsList.length > 0) {
      const preface = "Additional reviewer comments that should be considered:";
      const bulletList = commentsList.map((c) => `- ${c}`).join("\n");
      messages.push({ role: "user", content: [ { type: "text", text: `${preface}\n${bulletList}` } ] });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_VISION || "gpt-4o-mini";
  if (!apiKey) return { ok: false, status: 400, error: "openai_key_missing" as const };

  let parsedOut: Record<string, unknown> = {};
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, reasoning_effort: "low", verbosity: "low" }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { ok: false, status: 502, error: "openai_failed" as const, detail: json };
    }
    const content = (json as any)?.choices?.[0]?.message?.content?.trim() || "{}";
    try {
      parsedOut = JSON.parse(content);
    } catch {
      parsedOut = { violations: [], summary: "Parse failed", overall_confidence: 0 } as any;
    }
  } catch (e) {
    return { ok: false, status: 500, error: "openai_failed" as const };
  }

  const violations = Array.isArray((parsedOut as any).violations) ? (parsedOut as any).violations as Array<any> : [];

  // Deduplicate by code and build rows
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
      if (rationale) existing.rationale = existing.rationale ? `${existing.rationale}; ${rationale}` : rationale;
      if (Array.isArray(evidence_spans)) existing.evidence_spans = [...(existing.evidence_spans || []), ...evidence_spans];
    }
  }

  if (opts.replaceExisting) {
    await supabase.from("violations").delete().eq("submission_id", submissionId);
  }

  if (byCode.size > 0) {
    const rows = Array.from(byCode.values()).map((v) => ({
      submission_id: submissionId,
      code: v.code,
      title: v.title,
      description: v.rationale,
      evidence_spans: v.evidence_spans ?? null,
      severity: v.severity,
      confidence: v.confidence,
    }));
    const { error: vioErr } = await supabase.from("violations").insert(rows);
    if (vioErr) {
      // If insertion fails after deletion, we at least mark error status
      await supabase.from("submissions").update({ processing_status: "error" }).eq("id", submissionId);
      return { ok: false, status: 500, error: "insert_failed" as const };
    }
  } else if (opts.replaceExisting) {
    // Ensure we reflect no violations after replacement
  }

  const ms = Date.now() - start;
  await supabase
    .from("submissions")
    .update({ processing_status: "done", classifier_ms: ms, ai_version: model, ai_confidence: (parsedOut as any).overall_confidence ?? null })
    .eq("id", submissionId);

  return { ok: true as const, status: 200, violations: byCode.size, ms };
}


