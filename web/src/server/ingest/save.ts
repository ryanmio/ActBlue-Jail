/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServer } from "@/lib/supabase-server";

export type IngestTextParams = {
  text: string;
  senderId?: string | null;
  messageType: "sms" | "email" | "unknown";
  imageUrlPlaceholder?: string;
};

export type IngestResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

function computeHeuristicIsFundraising(text: string): boolean {
  const t = (text || "").toLowerCase();
  const positive = [
    "donate",
    "donation",
    "chip in",
    "chip-in",
    "contribute",
    "give now",
    "give today",
    "actblue",
    "match",
    "matched",
    "pitch in",
    "$1",
    "$3",
    "$5",
    "$10",
    "$20",
  ];
  let score = 0;
  for (const kw of positive) {
    if (t.includes(kw)) score += 1;
  }
  return score >= 2 || (score >= 1 && /\$\d{1,3}/.test(t));
}

export async function ingestTextSubmission(params: IngestTextParams): Promise<IngestResult> {
  const supabase = getSupabaseServer();
  const imageUrl = params.imageUrlPlaceholder || "sms://no-image";
  const isFundraising = computeHeuristicIsFundraising(params.text || "");

  const insertRow: Record<string, any> = {
    image_url: imageUrl,
    message_type: params.messageType,
    raw_text: params.text,
    sender_id: params.senderId || null,
    processing_status: "ocr",
    ocr_method: params.messageType === "sms" ? "sms" : "text",
    is_fundraising: isFundraising,
  };

  const { data, error } = await supabase
    .from("submissions")
    .insert(insertRow)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id: (data as any)?.id };
}

export function triggerPipelines(submissionId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    void fetch(`${base}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    void fetch(`${base}/api/sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  } catch (_e) {
    // best-effort fire-and-forget
  }
}


