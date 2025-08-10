import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getSupabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }
  const supabase = getSupabaseServer();
  const body = await req.json().catch(() => null);
  const submissionId: string | undefined = body?.submissionId;
  const dataUrl: string | undefined = body?.dataUrl;
  if (!submissionId || !dataUrl) return NextResponse.json({ error: "missing_args" }, { status: 400 });

  const start = Date.now();
  const [, base64] = dataUrl.split(",");
  const imgBuf = Buffer.from(base64, "base64");

  let processed: Buffer;
  try {
    processed = await sharp(imgBuf)
      .resize({ width: 1600, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .threshold(180)
      .toFormat("png")
      .toBuffer();
  } catch (e) {
    processed = imgBuf;
  }

  // OCR via hosted Tesseract (OCR.space)
  let text = "";
  let conf = 0;
  const ocrMethod = "ocrspace" as const;
  // Hosted Tesseract via OCR.space
  if (!env.OCRSPACE_API_KEY) {
    return NextResponse.json({ error: "ocrspace_key_missing" }, { status: 400 });
  }
  const b64 = processed.toString("base64");
  const form = new URLSearchParams();
  form.set("apikey", env.OCRSPACE_API_KEY);
  form.set("base64Image", `data:image/png;base64,${b64}`);
  form.set("language", "eng");
  form.set("isOverlayRequired", "false");
  const resp = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const json = await resp.json();
  if (!resp.ok || json?.IsErroredOnProcessing) {
    return NextResponse.json({ error: "ocrspace_failed", detail: json }, { status: 502 });
  }
  const parsedText: string = json?.ParsedResults?.[0]?.ParsedText ?? "";
  text = parsedText;
  conf = Number(json?.OCRExitCode === 1 ? 0.8 : 0.5);

  const ocrMs = Date.now() - start;
  await supabase
    .from("submissions")
    .update({ raw_text: text, ocr_method: ocrMethod, ocr_confidence: conf, ocr_ms: ocrMs, processing_status: "ocr" })
    .eq("id", submissionId);

  // Fire-and-forget classify
  try {
    void fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  } catch {}

  return NextResponse.json({ ok: true, rawText: text, conf, ms: ocrMs });
}
