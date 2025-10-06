/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServer } from "@/lib/supabase-server";
import { buildDedupeFields, findDuplicateCase } from "./dedupe";

export type IngestTextParams = {
  text: string; // Cleaned text for AI/heuristics
  rawText?: string; // Original unprocessed text for storage/audit
  senderId?: string | null;
  messageType: "sms" | "email" | "unknown";
  imageUrlPlaceholder?: string;
  emailSubject?: string | null;
  emailBody?: string | null;
};

export type IngestResult = {
  ok: boolean;
  id?: string;
  error?: string;
  isFundraising?: boolean;
  heuristic?: { score: number; hits: string[] };
  landingUrl?: string | null;
};

function computeHeuristic(text: string): { isFundraising: boolean; score: number; hits: string[] } {
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
  const hits: string[] = [];
  for (const kw of positive) {
    if (t.includes(kw)) {
      score += 1;
      hits.push(kw);
    }
  }
  const hasDollar = /\$\d{1,4}/.test(t);
  const isFundraising = score >= 2 || (score >= 1 && hasDollar);
  return { isFundraising, score: score + (hasDollar ? 1 : 0), hits };
}

function extractActBlueUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s<>"'\)]+/g;
  const matches = text.match(urlPattern) || [];
  const actBlueUrls: string[] = [];

  for (const rawUrl of matches) {
    try {
      // Clean trailing punctuation
      const cleaned = rawUrl.replace(/[.,;:)\]]+$/, "");
      const parsed = new URL(cleaned);
      const host = parsed.hostname.toLowerCase();

      // Validate ActBlue domain
      if (host === "actblue.com" || host.endsWith(".actblue.com")) {
        actBlueUrls.push(cleaned);
      }
    } catch {
      continue; // Invalid URL, skip
    }
  }

  if (actBlueUrls.length === 0) return null;
  if (actBlueUrls.length === 1) return actBlueUrls[0];

  // Pick URL with most query parameters (best landing page candidate)
  return actBlueUrls.reduce((best, url) => {
    const bestParams = new URL(best).searchParams.toString().length;
    const urlParams = new URL(url).searchParams.toString().length;
    return urlParams > bestParams ? url : best;
  });
}

export async function ingestTextSubmission(params: IngestTextParams): Promise<IngestResult> {
  const supabase = getSupabaseServer();
  const imageUrl = params.imageUrlPlaceholder || "sms://no-image";
  const heur = computeHeuristic(params.text || "");
  const isFundraising = heur.isFundraising;

  // Use raw text for duplicate detection if provided, otherwise use cleaned text
  const textForDedupe = params.rawText || params.text;

  // Duplicate detection before insert
  try {
    const dup = await findDuplicateCase(textForDedupe || "");
    if (dup.match && dup.caseId) {
      console.log("ingestTextSubmission:duplicate_detected", { match: dup.match, caseId: dup.caseId, distance: dup.distance });
      return { ok: false, id: dup.caseId, error: "duplicate" };
    }
  } catch (e) {
    console.warn("ingestTextSubmission:dedupe_failed", String(e));
  }

  const insertRow: Record<string, any> = {
    image_url: imageUrl,
    message_type: params.messageType,
    raw_text: params.text, // Store cleaned text (used by AI)
    sender_id: params.senderId || null,
    processing_status: isFundraising ? "ocr" : "done",
    ocr_method: params.messageType === "sms" ? "sms" : "text",
    is_fundraising: isFundraising,
    public: isFundraising, // hide non-fundraising by default
  };

  // Add email-specific fields
  if (params.emailSubject) {
    insertRow.email_subject = params.emailSubject;
  }
  if (params.emailBody) {
    insertRow.email_body = params.emailBody;
  }

  // Extract ActBlue landing URL (use raw text to catch all URLs)
  const landingUrl = extractActBlueUrl(textForDedupe || "");
  if (landingUrl) {
    insertRow.landing_url = landingUrl;
  }

  try {
    const fields = buildDedupeFields(textForDedupe || "");
    insertRow.normalized_text = fields.normalized_text;
    insertRow.normalized_hash = fields.normalized_hash;
    insertRow.simhash64 = fields.simhash64; // pass as string for int8 safety
  } catch (e) {
    console.warn("ingestTextSubmission:build_fields_failed", String(e));
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert(insertRow)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  const id = (data as any)?.id as string | undefined;
  console.log("ingestTextSubmission:inserted", { id: id || null, isFundraising, score: heur.score, hits: heur.hits, landingUrl: landingUrl || null });
  return { ok: true, id, isFundraising, heuristic: heur, landingUrl: landingUrl || null };
}

export function triggerPipelines(submissionId: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    void fetch(`${base}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(async (r) => {
      const text = await r.text().catch(() => "");
      console.log("triggerPipelines:classify", { status: r.status, body: text?.slice(0, 200) });
    }).catch((e) => {
      console.error("triggerPipelines:classify_error", String(e));
    });
    void fetch(`${base}/api/sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(async (r) => {
      const text = await r.text().catch(() => "");
      console.log("triggerPipelines:sender", { status: r.status, body: text?.slice(0, 200) });
    }).catch((e) => {
      console.error("triggerPipelines:sender_error", String(e));
    });
  } catch {
    // best-effort fire-and-forget
  }
}


