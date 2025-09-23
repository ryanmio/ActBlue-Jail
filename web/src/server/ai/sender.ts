/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServer } from "@/lib/supabase-server";

export type SenderType = "org" | "pac" | "candidate" | "unknown";

export async function runSenderExtraction(submissionId: string) {
  const supabase = getSupabaseServer();

  const { data: items, error } = await supabase
    .from("submissions")
    .select("id, image_url, raw_text")
    .eq("id", submissionId)
    .limit(1);
  if (error || !items?.[0]) {
    return { ok: false as const, status: 404, error: "not_found" as const };
  }
  const sub = items[0] as { id: string; image_url: string | null; raw_text: string | null };

  function parseSupabaseUrl(u?: string | null) {
    if (!u || !u.startsWith("supabase://")) return null as null | { bucket: string; path: string };
    const rest = u.replace("supabase://", "");
    const [bucket, ...pathParts] = rest.split("/");
    return { bucket, path: pathParts.join("/") };
  }

  let signedUrl: string | null = null;
  const parsed = parseSupabaseUrl(sub.image_url);
  if (parsed) {
    try {
      const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
      signedUrl = signed?.signedUrl || null;
    } catch (_e) {
      // ignore signing error; proceed with text-only
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false as const, status: 400, error: "openai_key_missing" as const };
  const model = process.env.OPENAI_MODEL_VISION || "gpt-4o-mini";

  type ImageUrlPart = { type: "image_url"; image_url: { url: string } };
  type TextPart = { type: "text"; text: string };
  type ContentPart = ImageUrlPart | TextPart;
  type Message = { role: "system" | "user"; content: string | ContentPart[] };

  const system = `You are reviewing a political fundraising appeal to extract the sending entity.\n\nGoals:\n- Identify the organization, PAC, or candidate that sent the message or is responsible for the messaging.\n- Prefer explicit disclosures, headers/footers, sender lines, or signature blocks.\n- If the message ends with a PAC or organization name, use that.\n- Use the screenshot image (logos/branding) to corroborate when available.\n- If none is provided, return sender_name = null and sender_type = "unknown".\n\nOutput JSON only (no markdown), with keys:\n{\n  "sender_name": string | null,\n  "sender_type": "org" | "pac" | "candidate" | "unknown",\n  "confidence": number (0..1),\n  "notes": string\n}`;

  const userContent: ContentPart[] = [ { type: "text", text: String(sub.raw_text || "").trim() || "(none)" } ];
  if (signedUrl) userContent.push({ type: "image_url", image_url: { url: signedUrl } });
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  let parsedOut: { sender_name: string | null; sender_type: SenderType; confidence: number; notes?: string } = {
    sender_name: null,
    sender_type: "unknown",
    confidence: 0.2,
  };
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, reasoning_effort: "low", verbosity: "low" }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      return { ok: false as const, status: 502, error: "openai_failed" as const, detail: json } as const;
    }
    const maybeContent = (json as any)?.choices?.[0]?.message?.content;
    const content = typeof maybeContent === "string" ? maybeContent.trim() : "";
    try {
      const obj = JSON.parse(content || "{}");
      parsedOut = {
        sender_name: typeof obj.sender_name === "string" && obj.sender_name.trim() ? obj.sender_name.trim() : null,
        sender_type: (obj.sender_type === "org" || obj.sender_type === "pac" || obj.sender_type === "candidate" || obj.sender_type === "unknown") ? obj.sender_type : "unknown",
        confidence: typeof obj.confidence === "number" ? obj.confidence : 0.2,
        notes: typeof obj.notes === "string" ? obj.notes : undefined,
      };
    } catch {
      parsedOut = { sender_name: null, sender_type: "unknown", confidence: 0.2, notes: "Parse failed" };
    }
  } catch {
    return { ok: false as const, status: 500, error: "openai_failed" as const };
  }

  const senderName = parsedOut.sender_name && parsedOut.sender_name.trim().length > 0 ? parsedOut.sender_name.trim() : null;
  try {
    await supabase
      .from("submissions")
      .update({ sender_name: senderName })
      .eq("id", submissionId);
  } catch {
    // ignore update failures for sender
  }
  return { ok: true as const, status: 200 };
}


