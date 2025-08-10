import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

  try {
    const supabase = getSupabaseServer();
    type Row = {
      id: string;
      created_at: string;
      sender_id: string | null;
      sender_name: string | null;
      raw_text: string | null;
    };
    const { data, error } = await supabase
      .from("submissions")
      .select("id, created_at, sender_id, sender_name, raw_text")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = (data || []) as Row[];
    const items = rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      senderId: r.sender_id,
      senderName: r.sender_name,
      rawText: r.raw_text,
    }));
    return NextResponse.json({ items, nextCursor: null });
  } catch (err) {
    console.error("/api/cases supabase error", err);
    return NextResponse.json({ items: [], nextCursor: null, error: "unavailable" });
  }
}

