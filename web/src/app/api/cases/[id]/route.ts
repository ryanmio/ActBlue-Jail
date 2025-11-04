import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

type ViolationRow = {
  severity?: number | string | null;
  confidence?: number | string | null;
  description?: string | null;
};

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
    const { data: commentsRows } = await supabase
      .from("comments")
      .select("id, content, created_at, kind")
      .eq("submission_id", id)
      .eq("kind", "user")
      .order("created_at", { ascending: true })
      .limit(10);
    // Prefer stored AI summary; fall back to top violation rationale
    let summary: string | null = (item as unknown as { ai_summary?: string | null }).ai_summary ?? null;
    const list = (Array.isArray(vios) ? vios : []) as Array<ViolationRow>;
    if (!summary && list.length > 0) {
      const sorted = [...list].sort(
        (a, b) =>
          Number(b.severity ?? 0) - Number(a.severity ?? 0) ||
          (Number(b.confidence ?? 0) - Number(a.confidence ?? 0))
      );
      summary = sorted[0]?.description ?? null;
    }
    // Load reports and replies
    const { data: reportRows } = await supabase
      .from("reports")
      .select("id, case_id, to_email, cc_email, subject, body, screenshot_url, landing_url, status, created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: true });
    // Secondary signal for hasReport that does not rely on reports table access (RLS-safe)
    const { data: landingNotes } = await supabase
      .from("comments")
      .select("id, content")
      .eq("submission_id", id)
      .eq("kind", "landing_page")
      .ilike("content", "Report filed%")
      .limit(1);
    const { data: replyRows } = await supabase
      .from("report_replies")
      .select("id, report_id, case_id, from_email, body_text, created_at")
      .eq("case_id", id)
      .order("created_at", { ascending: true });

    // Load verdict if exists
    const { data: verdictRows } = await supabase
      .from("report_verdicts")
      .select("id, case_id, verdict, explanation, determined_by, created_at, updated_at")
      .eq("case_id", id)
      .order("created_at", { ascending: false })
      .limit(1);
    
    const verdict = verdictRows?.[0] || null;

    const hasReport = (Array.isArray(reportRows) && reportRows.length > 0) || (Array.isArray(landingNotes) && landingNotes.length > 0);
    return NextResponse.json({ item, violations: vios || [], summary, comments: commentsRows || [], reports: reportRows || [], report_replies: replyRows || [], verdict, hasReport });
  } catch (err) {
    console.error("/api/cases/[id] supabase error", err);
    return NextResponse.json({ item: null, violations: [], comments: [], reports: [], report_replies: [] }, { status: 500 });
  }
}
