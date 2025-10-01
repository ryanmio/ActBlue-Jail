import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest) {
  void _req;
  // Placeholder for invoking Supabase Edge Function or server action
  // For MVP, this returns success without doing work
  return NextResponse.json({ ok: true, message: "process_job stub" });
}

