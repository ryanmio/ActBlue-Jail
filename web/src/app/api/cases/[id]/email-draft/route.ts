import { NextResponse } from "next/server";

export async function GET() {
  // Disabled for MVP; return empty draft
  return NextResponse.json({ subject: "", body: "" });
}
