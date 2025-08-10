import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  console.log("/api/sender invoked");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "openai_key_missing" }, { status: 400 });

  const supabase = getSupabaseServer();
  const body = await req.json().catch(() => null);
  const submissionId: string | undefined = body?.submissionId;
  if (!submissionId) return NextResponse.json({ error: "missing_args" }, { status: 400 });

  const { data: items, error } = await supabase
    .from("submissions")
    .select("id, image_url, raw_text")
    .eq("id", submissionId)
    .limit(1);
  if (error || !items?.[0]) {
    console.error("/api/sender submission not found or db error", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
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
    } catch (e) {
      console.warn("/api/sender failed to sign image", e);
    }
  }

  const model = process.env.OPENAI_MODEL_VISION || "gpt-4o-mini";
  type SenderType = "org" | "pac" | "candidate" | "unknown";
  interface SenderResult {
    sender_name: string | null;
    sender_type: SenderType;
    confidence: number;
    notes?: string;
  }
  type ImageUrlPart = { type: "image_url"; image_url: { url: string } };
  type TextPart = { type: "text"; text: string };
  type ContentPart = ImageUrlPart | TextPart;
  type Message = { role: "system" | "user"; content: string | ContentPart[] };
  let parsedOut: SenderResult = { sender_name: null, sender_type: "unknown", confidence: 0.2, notes: "init" };
  try {
    const system = `You are reviewing a political fundraising appeal to extract the sending entity.\n\nGoals:\n- Identify the organization, PAC, or candidate that sent the message or is responsible for the messaging.\n- Prefer explicit disclosures, headers/footers, sender lines, or signature blocks.\n- If the message ends with a PAC or organization name, use that.\n- Use the screenshot image (logos/branding) to corroborate when available.\n- If none is provided, return sender_name = null and sender_type = "unknown".\n\nOutput JSON only (no markdown), with keys:\n{\n  "sender_name": string | null,\n  "sender_type": "org" | "pac" | "candidate" | "unknown",\n  "confidence": number (0..1),\n  "notes": string\n}`;
    const userContent: ContentPart[] = [ { type: "text", text: String(sub.raw_text || "").trim() || "(none)" } ];
    if (signedUrl) userContent.push({ type: "image_url", image_url: { url: signedUrl } });
    const messages: Message[] = [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        reasoning_effort: "low",
        verbosity: "low",
      }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      console.error("/api/sender openai failed", resp.status, json);
      return NextResponse.json({ error: "openai_failed", detail: json }, { status: 502 });
    }
    type OpenAIChatResponse = { choices?: Array<{ message?: { content?: string } }> };
    const maybeContent = (json as OpenAIChatResponse).choices?.[0]?.message?.content;
    const content = typeof maybeContent === "string" ? maybeContent.trim() : "";
    try {
      const obj = JSON.parse(content || "{}");
      parsedOut = {
        sender_name: typeof obj.sender_name === "string" && obj.sender_name.trim() ? obj.sender_name.trim() : null,
        sender_type: (obj.sender_type === "org" || obj.sender_type === "pac" || obj.sender_type === "candidate" || obj.sender_type === "unknown") ? obj.sender_type : "unknown",
        confidence: typeof obj.confidence === "number" ? obj.confidence : 0.2,
        notes: typeof obj.notes === "string" ? obj.notes : undefined,
      };
    } catch (_e) {
      console.error("/api/sender parse_error content=", content);
      parsedOut = { sender_name: null, sender_type: "unknown", confidence: 0.2, notes: "Parse failed" };
    }
  } catch (e) {
    console.error("/api/sender error calling openai", e);
    return NextResponse.json({ error: "openai_failed" }, { status: 500 });
  }

  const senderName = parsedOut.sender_name && parsedOut.sender_name.trim().length > 0 ? parsedOut.sender_name.trim() : null;

  try {
    const { error: updErr } = await supabase
      .from("submissions")
      .update({ sender_name: senderName })
      .eq("id", submissionId);
    if (updErr) {
      console.error("/api/sender failed to update sender_name", updErr);
    }
  } catch (e) {
    console.error("/api/sender exception updating db", e);
  }

  return NextResponse.json({ ok: true, sender_name: senderName, model });
}


