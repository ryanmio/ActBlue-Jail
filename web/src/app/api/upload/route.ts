import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { randomUUID } from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";

const BodySchema = z.object({
  filename: z.string(),
  contentType: z.string().default("image/jpeg"),
  mode: z.enum(["image", "text"]).default("image"),
});

function sanitizeFilename(originalName: string, contentType?: string): string {
  const name = String(originalName || "upload");
  const lastDot = name.lastIndexOf(".");
  const rawBase = lastDot > 0 ? name.slice(0, lastDot) : name;
  const rawExt = lastDot > 0 ? name.slice(lastDot + 1) : "";

  // Replace a wide range of unicode spaces with a regular hyphen
  const spaceRegex = /[\s\u00A0\u202F\u2000-\u200B\u205F\u3000]+/g;
  // Remove anything not alphanumeric, dot, underscore, or hyphen
  const unsafeChars = /[^A-Za-z0-9._-]+/g;

  let base = rawBase
    .normalize("NFKD")
    .replace(spaceRegex, "-")
    .replace(unsafeChars, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  if (!base) base = "file";
  if (base.length > 100) base = base.slice(0, 100);

  let ext = String(rawExt || "").toLowerCase().replace(unsafeChars, "");
  if (!ext) {
    const ct = String(contentType || "").toLowerCase();
    if (ct === "image/jpeg" || ct === "image/jpg") ext = "jpg";
    else if (ct === "image/png") ext = "png";
    else if (ct === "image/heic") ext = "heic";
    else if (ct === "image/heif") ext = "heif";
    else if (ct === "application/pdf") ext = "pdf";
    else ext = "bin";
  }

  return `${base}.${ext}`;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const submissionId = randomUUID();
  const safeFilename = sanitizeFilename(parsed.data.filename, parsed.data.contentType);
  const objectPath = `${submissionId}/${safeFilename}`;
  const isTextMode = parsed.data.mode === "text";
  const imageUrl = isTextMode
    ? `text://${submissionId}`
    : `supabase://${env.SUPABASE_BUCKET_INCOMING}/${objectPath}`;

  let insertOk = false;
  let insertError: string | null = null;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("submissions").insert({
      id: submissionId,
      image_url: imageUrl,
      message_type: "unknown",
      public: true,
    });
    if (error) throw error;
    insertOk = true;
  } catch (e) {
    insertError = e instanceof Error ? e.message : String(e);
    console.error("insert submission failed", e);
  }

  return NextResponse.json({
    submissionId,
    bucket: env.SUPABASE_BUCKET_INCOMING,
    objectPath,
    imageUrl,
    insertOk,
    insertError,
  });
}
