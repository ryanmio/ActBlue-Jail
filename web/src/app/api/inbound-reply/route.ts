import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { getSupabaseServer } from "@/lib/supabase-server";

// This endpoint expects a Postmark-style inbound payload
// We will parse sender, subject, TextBody/HtmlBody, and try to extract Case ID

function extractIds(subject: string | null, body: string | null): { caseId: string | null; shortId: string | null } {
  const s = subject || "";
  const b = body || "";
  const shortMatch = s.match(/Case\s+#([a-f0-9]{8})/i);
  const uuidMatch = b.match(/Case\s+ID:\s*([0-9a-fA-F-]{36})/);
  return { caseId: uuidMatch ? uuidMatch[1] : null, shortId: shortMatch ? shortMatch[1] : null };
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const payload = (await req.json().catch(() => null)) as any;
  if (!payload) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const fromEmail: string = payload.FromFull?.Email || payload.From || "";
  const subject: string = payload.Subject || "";
  const textBody: string = payload.TextBody || payload.text || payload.text_body || "";
  const htmlBody: string = payload.HtmlBody || payload.html || "";
  const bodyText = textBody || (typeof htmlBody === "string" ? htmlBody.replace(/<[^>]+>/g, " ") : "");

  const { caseId, shortId } = extractIds(subject, bodyText);

  let matchedCaseId: string | null = null;
  if (caseId) {
    matchedCaseId = caseId;
  } else if (shortId) {
    // Try to find by short prefix
    const { data: rows } = await supabase
      .from("submissions")
      .select("id")
      .ilike("id", `${shortId}%`)
      .limit(1);
    matchedCaseId = rows?.[0]?.id || null;
  }

  if (!matchedCaseId) {
    console.error("Inbound reply: no case match", { subject });
    return NextResponse.json({ ok: false, error: "no_match" }, { status: 202 });
  }

  // Find a report to link to (latest for the case)
  const { data: reports } = await supabase
    .from("reports")
    .select("id")
    .eq("case_id", matchedCaseId)
    .order("created_at", { ascending: false })
    .limit(1);
  const reportId = reports?.[0]?.id || null;

  // Save reply
  const { error: insErr } = await supabase.from("report_replies").insert({
    report_id: reportId,
    case_id: matchedCaseId,
    from_email: fromEmail || "",
    body_text: bodyText || "",
  });
  if (insErr) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

  if (reportId) {
    await supabase.from("reports").update({ status: "responded" }).eq("id", reportId);
  }

  return NextResponse.json({ ok: true });
}


