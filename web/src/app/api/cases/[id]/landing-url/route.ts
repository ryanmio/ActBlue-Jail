import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getSupabaseAdmin } from "@/lib/supabase-server";

function parseSupabaseUrl(u: string | null | undefined) {
  if (!u || !u.startsWith("supabase://")) return null;
  const rest = u.replace("supabase://", "");
  const [bucket, ...pathParts] = rest.split("/");
  const path = pathParts.join("/");
  return { bucket, path };
}

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  try {
    const supabase = getSupabaseAdmin();
    console.log("/api/cases/[id]/landing-url:start", { id });
    const { data: items, error } = await supabase
      .from("submissions")
      .select("landing_screenshot_url, landing_url, landing_render_status")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const row = items?.[0] as { landing_screenshot_url?: string | null; landing_url?: string | null; landing_render_status?: string | null } | undefined;
    console.log("/api/cases/[id]/landing-url:row", row || null);
    const imageUrl = row?.landing_screenshot_url || null;
    // Accept both supabase://bucket/path and raw https URLs
    if (!imageUrl) {
      console.log("/api/cases/[id]/landing-url:no_image", { status: row?.landing_render_status || null });
      return NextResponse.json({ url: null, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null });
    }
    if (imageUrl.startsWith("http")) {
      console.log("/api/cases/[id]/landing-url:using_raw", { imageUrl: imageUrl.slice(0, 60) + "…" });
      return NextResponse.json({ url: imageUrl, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null, mime: "image/png" });
    }
    const parsed = parseSupabaseUrl(imageUrl);
    if (!parsed) {
      console.warn("/api/cases/[id]/landing-url:parse_failed", { imageUrl });
      return NextResponse.json({ url: null, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null });
    }
    console.log("/api/cases/[id]/landing-url:sign_attempt", parsed);
    const { data: signed, error: signErr } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
    if (signErr) {
      console.error("/api/cases/[id]/landing-url:sign_error", { message: signErr.message, bucket: parsed.bucket, path: parsed.path });
    }
    const url = signed?.signedUrl || null;
    console.log("/api/cases/[id]/landing-url:done", { hasUrl: !!url });
    return NextResponse.json({ url, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null, mime: "image/png" });
  } catch (e) {
    console.error("/api/cases/[id]/landing-url:error", e);
    return NextResponse.json({ url: null, landingUrl: null, status: null, error: "unavailable" }, { status: 403 });
  }
}


