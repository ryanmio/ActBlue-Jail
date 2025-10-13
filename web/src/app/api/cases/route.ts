import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const pageParam = searchParams.get("page");
  const explicitOffset = Number(searchParams.get("offset"));
  const page = Math.max(Number(pageParam || 1) || 1, 1);
  const offset = Number.isFinite(explicitOffset) && explicitOffset >= 0 ? explicitOffset : (page - 1) * limit;
  const q = (searchParams.get("q") || "").trim();
  const include = (searchParams.get("include") || "").split(",").map((s) => s.trim()).filter(Boolean);
  // Support both repeated ?codes=AB001&codes=AB003 and comma-separated ?codes=AB001,AB003
  const multiCodes = searchParams.getAll("codes");
  const singleCodes = (searchParams.get("codes") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const codes = Array.from(new Set([...(multiCodes || []), ...(singleCodes || [])])).filter(Boolean);

  try {
    const supabase = getSupabaseServer();
    type Row = {
      id: string;
      created_at: string;
      sender_id: string | null;
      sender_name: string | null;
      raw_text: string | null;
      message_type: string | null;
      forwarder_email: string | null;
    };

    let builder = supabase
      .from("submissions")
      .select("id, created_at, sender_id, sender_name, raw_text, message_type, forwarder_email", { count: "exact" })
      .order("created_at", { ascending: false });

    // Only show public cases
    builder = builder.eq("public", true);

    // If violation codes are provided, filter submissions to those having at least one matching code
    if (codes.length > 0) {
      const { data: vioRows, error: vioErr } = await supabase
        .from("violations")
        .select("submission_id, code")
        .in("code", codes);
      if (vioErr) throw vioErr;
      const idSet = new Set<string>();
      for (const r of vioRows || []) {
        const sid = String((r as { submission_id: string }).submission_id);
        if (sid) idSet.add(sid);
      }
      const ids = Array.from(idSet);
      if (ids.length === 0) {
        return NextResponse.json({ items: [], total: 0, limit, offset, page, hasMore: false });
      }
      builder = builder.in("id", ids);
    }

    if (q.length > 0) {
      const sanitized = q.replace(/[%]/g, "").replace(/,/g, " ");
      builder = builder.or(`sender_name.ilike.%${sanitized}%,sender_id.ilike.%${sanitized}%`);
    }

    const { data, error, count } = await builder.range(offset, offset + limit - 1);
    if (error) throw error;
    const rows = (data || []) as Row[];
    let items = rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      senderId: r.sender_id,
      senderName: r.sender_name,
      rawText: r.raw_text,
      messageType: r.message_type,
      forwarderEmail: r.forwarder_email,
    }));

    // Optionally include top violations (deduped by code, max 3 per case)
    if (include.includes("top_violations") && items.length > 0) {
      try {
        type VRow = { submission_id: string; code?: string | null; title?: string | null; severity?: number | string | null; confidence?: number | string | null };
        const ids = items.map((i) => i.id);
        const { data: vioRows, error: vioErr } = await supabase
          .from("violations")
          .select("submission_id, code, title, severity, confidence")
          .in("submission_id", ids);
        if (vioErr) throw vioErr;
        const byCase = new Map<string, Array<{ code: string; title: string; severity: number; confidence: number }>>();
        for (const v of (vioRows || []) as VRow[]) {
          const sid = String(v.submission_id);
          const code = typeof v.code === "string" ? v.code.trim() : "";
          const title = typeof v.title === "string" ? v.title.trim() : code || "Violation";
          const severity = Number(v.severity ?? 0) || 0;
          const confidence = Number(v.confidence ?? 0) || 0;
          if (!code) continue;
          const arr = byCase.get(sid) || [];
          arr.push({ code, title, severity, confidence });
          byCase.set(sid, arr);
        }
        items = items.map((it) => {
          const src = byCase.get(it.id) || [];
          const seen = new Set<string>();
          const top: Array<{ code: string; title: string }> = [];
          for (const v of src.sort((a, b) => b.severity - a.severity || b.confidence - a.confidence)) {
            if (seen.has(v.code)) continue;
            seen.add(v.code);
            top.push({ code: v.code, title: v.title });
            if (top.length >= 3) break;
          }
          return { ...it, issues: top } as typeof it & { issues: Array<{ code: string; title: string }> };
        });
      } catch {}
    }
    const total = typeof count === "number" ? count : items.length + offset; // fallback
    const hasMore = offset + items.length < total;
    return NextResponse.json({ items, total, limit, offset, page, hasMore });
  } catch (err) {
    console.error("/api/cases supabase error", err);
    return NextResponse.json({ items: [], total: 0, limit, offset, page, hasMore: false, error: "unavailable" });
  }
}

