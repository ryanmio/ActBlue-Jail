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
    return NextResponse.json({ item, violations: vios || [] });
  } catch (err) {
    console.error("/api/cases/[id] supabase error", err);
    return NextResponse.json({ item: null, violations: [] }, { status: 500 });
  }
}
