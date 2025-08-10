import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const supabase = getSupabaseServer();
    const { data: items, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .limit(1);
    if (error) throw error;
    const item = items?.[0] || null;
    if (!item) return NextResponse.json({ item: null, violations: [] }, { status: 404 });

    const { data: vios, error: vErr } = await supabase
      .from("violations")
      .select("*")
      .eq("submission_id", id);
    if (vErr) throw vErr;
    // Compute a simple summary on the server for convenience: pick the highest severity/confidence description
    let summary: string | null = null;
    const list = Array.isArray(vios) ? vios : [];
    if (list.length > 0) {
      const sorted = [...list].sort((a: any, b: any) => (Number(b.severity || 0) - Number(a.severity || 0)) || (Number(b.confidence || 0) - Number(a.confidence || 0)));
      summary = sorted[0]?.description ?? null;
    }
    return NextResponse.json({ item, violations: vios || [], summary });
  } catch (err) {
    console.error("/api/cases/[id] supabase error", err);
    return NextResponse.json({ item: null, violations: [] }, { status: 500 });
  }
}
