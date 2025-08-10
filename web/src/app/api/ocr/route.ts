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
  console.log("/api/ocr:start", { submissionId, inBytes: imgBuf.length });

  let processed: Buffer;
  try {
    const preStart = Date.now();
    processed = await sharp(imgBuf)
      .resize({ width: 1600, withoutEnlargement: false })
      .grayscale()
      .normalise()
      .threshold(180)
      .toFormat("png")
      .toBuffer();
    console.log("/api/ocr:preprocess_ok", { outBytes: processed.length, ms: Date.now() - preStart });
  } catch (e) {
    console.warn("/api/ocr:preprocess_failed — using original image", String(e));
    processed = imgBuf;
  }

  // OCR via hosted Tesseract (OCR.space)
  let text = "";
  let conf = 0;
  const ocrMethod = "ocrspace" as const;
  if (!env.OCRSPACE_API_KEY) {
    return NextResponse.json({ error: "ocrspace_key_missing" }, { status: 400 });
  }

  async function callOcrSpace(imgBase64: string, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const form = new URLSearchParams();
      form.set("apikey", env.OCRSPACE_API_KEY as string);
      form.set("base64Image", `data:image/png;base64,${imgBase64}`);
      form.set("language", "eng");
      form.set("isOverlayRequired", "false");
      const attemptStart = Date.now();
      const resp = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: controller.signal,
      });
      const json = await resp.json();
      if (!resp.ok || json?.IsErroredOnProcessing) {
        console.warn("/api/ocr:ocrspace_response_err", { status: resp.status, ms: Date.now() - attemptStart, detail: json });
        return { ok: false as const, json };
      }
      const parsedText: string = json?.ParsedResults?.[0]?.ParsedText ?? "";
      const confidence = Number(json?.OCRExitCode === 1 ? 0.8 : 0.5);
      console.log("/api/ocr:ocrspace_ok", { textLen: parsedText?.length || 0, conf: confidence, ms: Date.now() - attemptStart });
      return { ok: true as const, text: parsedText, confidence };
    } catch (err) {
      console.warn("/api/ocr:ocrspace_fetch_err", String(err));
      return { ok: false as const, json: { error: String(err) } };
    } finally {
      clearTimeout(timeout);
    }
  }

  const b64Processed = processed.toString("base64");
  console.log("/api/ocr:attempt_1", { processed: true, timeoutMs: 30000 });
  let result = await callOcrSpace(b64Processed, 30000);
  if (!result.ok) {
    // Retry once with original (non-processed) image and a longer timeout
    console.warn("/api/ocr:attempt_1_failed", result.json?.ErrorMessage || result.json);
    console.log("/api/ocr:attempt_2", { processed: false, timeoutMs: 45000 });
    const b64Original = imgBuf.toString("base64");
    result = await callOcrSpace(b64Original, 45000);
  }
  if (!result.ok) {
    return NextResponse.json({ error: "ocrspace_failed", detail: result.json || null }, { status: 502 });
  }
  text = result.text;
  conf = result.confidence;
  console.log("/api/ocr:success", { textLen: text.length, conf });

  const ocrMs = Date.now() - start;
  await supabase
    .from("submissions")
    .update({ raw_text: text, ocr_method: ocrMethod, ocr_confidence: conf, ocr_ms: ocrMs, processing_status: "ocr" })
    .eq("id", submissionId);
  console.log("/api/ocr:db_update_ok", { submissionId, ocrMs });

  // Fire-and-forget classify (absolute URL). Log failures.
  try {
    const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const classifyUrl = `${base}/api/classify`;
    const senderUrl = `${base}/api/sender`;
    void fetch(classifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("/api/ocr classify trigger failed", res.status, text);
        }
      })
      .catch((err) => {
        console.error("/api/ocr classify trigger error", err);
      });

    void fetch(senderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("/api/ocr sender trigger failed", res.status, text);
        }
      })
      .catch((err) => {
        console.error("/api/ocr sender trigger error", err);
      });
  } catch (err) {
    console.error("/api/ocr classify trigger setup error", err);
  }

  return NextResponse.json({ ok: true, rawText: text, conf, ms: ocrMs });
}
