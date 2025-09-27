import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

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
    const supabase = getSupabaseAdmin();
    const { data: items, error } = await supabase
      .from("submissions")
      .select("landing_screenshot_url, landing_url, landing_render_status")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const row = items?.[0] as { landing_screenshot_url?: string | null; landing_url?: string | null; landing_render_status?: string | null } | undefined;
    const imageUrl = row?.landing_screenshot_url || null;
    // Accept both supabase://bucket/path and raw https URLs
    if (!imageUrl) {
      return NextResponse.json({ url: null, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null });
    }
    if (imageUrl.startsWith("http")) {
      return NextResponse.json({ url: imageUrl, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null, mime: "image/png" });
    }
    const parsed = parseSupabaseUrl(imageUrl);
    if (!parsed) {
      return NextResponse.json({ url: null, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null });
    }
    const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
    const url = signed?.signedUrl || null;
    return NextResponse.json({ url, landingUrl: row?.landing_url || null, status: row?.landing_render_status || null, mime: "image/png" });
  } catch (e) {
    return NextResponse.json({ url: null, landingUrl: null, status: null, error: "unavailable" }, { status: 403 });
  }
}


