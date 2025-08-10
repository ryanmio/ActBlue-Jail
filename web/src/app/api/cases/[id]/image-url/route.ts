import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

function parseSupabaseUrl(u: string | null | undefined) {
  if (!u || !u.startsWith("supabase://")) return null;
  const rest = u.replace("supabase://", "");
  const [bucket, ...pathParts] = rest.split("/");
  const path = pathParts.join("/");
  return { bucket, path };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const supabase = getSupabaseServer();
    const { data: items, error } = await supabase.from("submissions").select("image_url").eq("id", id).limit(1);
    if (error) throw error;
    const imageUrl = items?.[0]?.image_url as string | undefined;
    const parsed = parseSupabaseUrl(imageUrl);
    if (!parsed) return NextResponse.json({ url: null });

    const { data: signed, error: sErr } = await supabase
      .storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600);
    if (sErr) throw sErr;

    return NextResponse.json({ url: signed?.signedUrl || null });
  } catch (e) {
    return NextResponse.json({ url: null, error: "unavailable" }, { status: 403 });
  }
}
