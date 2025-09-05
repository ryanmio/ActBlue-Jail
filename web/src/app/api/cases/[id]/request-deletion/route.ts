import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await req.json().catch(() => ({}));
    const reasonRaw = (body?.reason ?? "");
    const requesterRaw = (body?.requester ?? null);
    const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : "";
    const requester = typeof requesterRaw === "string" ? requesterRaw.slice(0, 200) : null;
    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    // Verify the submission exists (optional but nice)
    const { data: sub, error: subErr } = await supabase
      .from("submissions")
      .select("id")
      .eq("id", id)
      .limit(1);
    if (subErr) throw subErr;
    if (!sub || sub.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("deletion_requests")
      .insert({ submission_id: id, reason, requester })
      .select("id, created_at")
      .limit(1);
    if (error) throw error;

    // Soft-hide immediately: set public=false
    const { error: updErr } = await supabase
      .from("submissions")
      .update({ public: false })
      .eq("id", id);
    if (updErr) throw updErr;

    // Log to audit_log for transparency (actor=anonymous)
    await supabase
      .from("audit_log")
      .insert({
        actor: "anonymous",
        action: "request_deletion",
        submission_id: id,
        payload: { reason, requester },
      });

    return NextResponse.json({ ok: true, id: data?.[0]?.id ?? null });
  } catch (err) {
    console.error("/api/cases/[id]/request-deletion error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}


