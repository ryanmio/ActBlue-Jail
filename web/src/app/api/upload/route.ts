import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { randomUUID } from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";

const BodySchema = z.object({
  filename: z.string(),
  contentType: z.string().default("image/jpeg"),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const submissionId = randomUUID();
  const objectPath = `${submissionId}/${parsed.data.filename}`;
  const imageUrl = `supabase://${env.SUPABASE_BUCKET_INCOMING}/${objectPath}`;

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
