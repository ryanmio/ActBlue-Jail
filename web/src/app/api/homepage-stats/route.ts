import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recentLimit = Math.min(Number(searchParams.get("recent")) || 5, 10);
  const offendersLimit = Math.min(Number(searchParams.get("offenders")) || 10, 20);
  const days = searchParams.get("days"); // null = lifetime, number = last N days

  try {
    const supabase = getSupabaseServer();
    
    const { data, error } = await supabase.rpc("get_homepage_stats", {
      recent_limit: recentLimit,
      offenders_limit: offendersLimit,
      offenders_days: days ? Number(days) : null,
    });

    if (error) {
      console.error("/api/homepage-stats error:", error);
      return NextResponse.json(
        { error: "Failed to fetch stats", detail: error.message },
        { status: 500 }
      );
    }

    // data is already a JSON object with recent_cases and worst_offenders
    return NextResponse.json(data || { recent_cases: [], worst_offenders: [] });
  } catch (err) {
    console.error("/api/homepage-stats unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

