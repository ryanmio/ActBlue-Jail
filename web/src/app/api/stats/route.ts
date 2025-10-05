import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "30";
  // Optional sender filter: support repeated or comma-separated `sender` values
  const sendersMulti = searchParams.getAll("sender");
  const sendersSingle = (searchParams.get("sender") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const senderNames = Array.from(new Set([...(sendersMulti || []), ...(sendersSingle || [])])).filter(Boolean);

  try {
    const supabase = getSupabaseServer();
    
    // Calculate start date based on range
    let startDate: string | null = null;
    const now = new Date();
    
    if (range === "7") {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      startDate = date.toISOString();
    } else if (range === "30") {
      const date = new Date(now);
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString();
    } else if (range === "90") {
      const date = new Date(now);
      date.setDate(date.getDate() - 90);
      startDate = date.toISOString();
    }
    // else lifetime - startDate remains null

    // Call RPC function
    const { data, error } = await supabase.rpc("get_stats", {
      start_date: startDate,
      end_date: now.toISOString(),
      sender_names: senderNames.length > 0 ? senderNames : null,
    });

    if (error) {
      console.error("/api/stats error:", error);
      return NextResponse.json(
        { error: "Failed to fetch stats", detail: error.message },
        { status: 500 }
      );
    }

    // debug logging for verification
    console.log("/api/stats params", {
      range,
      startDate,
      endDate: now.toISOString(),
      senderNames,
    });
    try {
      const payload = data || {};
      // compute a simple sum from top_senders to compare to KPIs
      const ts = Array.isArray(payload?.top_senders) ? payload.top_senders : [];
      const sums = ts.reduce(
        (acc: any, s: any) => {
          acc.captures += Number(s?.total_captures || 0);
          acc.violations += Number(s?.captures_with_violations || 0);
          return acc;
        },
        { captures: 0, violations: 0 }
      );
      console.log("/api/stats summary", {
        total_captures: payload?.kpis?.total_captures ?? null,
        captures_with_violations: payload?.kpis?.captures_with_violations ?? null,
        total_reports: payload?.kpis?.total_reports ?? null,
        top_senders_sum: sums,
        top_senders_sample: ts.slice(0, 3),
      });
    } catch {}

    return NextResponse.json(data || {});
  } catch (err) {
    console.error("/api/stats unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
