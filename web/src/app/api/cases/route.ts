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

  try {
    const supabase = getSupabaseServer();
    type Row = {
      id: string;
      created_at: string;
      sender_id: string | null;
      sender_name: string | null;
      raw_text: string | null;
    };

    let builder = supabase
      .from("submissions")
      .select("id, created_at, sender_id, sender_name, raw_text", { count: "exact" })
      .order("created_at", { ascending: false });

    // Only show public cases
    builder = builder.eq("public", true);

    if (q.length > 0) {
      const sanitized = q.replace(/[%]/g, "").replace(/,/g, " ");
      builder = builder.or(`sender_name.ilike.%${sanitized}%,sender_id.ilike.%${sanitized}%`);
    }

    const { data, error, count } = await builder.range(offset, offset + limit - 1);
    if (error) throw error;
    const rows = (data || []) as Row[];
    const items = rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      senderId: r.sender_id,
      senderName: r.sender_name,
      rawText: r.raw_text,
    }));
    const total = typeof count === "number" ? count : items.length + offset; // fallback
    const hasMore = offset + items.length < total;
    return NextResponse.json({ items, total, limit, offset, page, hasMore });
  } catch (err) {
    console.error("/api/cases supabase error", err);
    return NextResponse.json({ items: [], total: 0, limit, offset, page, hasMore: false, error: "unavailable" });
  }
}

