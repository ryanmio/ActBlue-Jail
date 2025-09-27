import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  void _req;
  // Disabled for MVP; return empty draft
  return NextResponse.json({ subject: "", body: "" });
}
