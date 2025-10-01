/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * POST /api/evaluation/submit
 * Submit an individual evaluation response
 * Body: {
 *   sessionId: string (optional, will create if not provided),
 *   deviceId: string (required),
 *   submissionId: string (required),
 *   manualViolations: string[] (required),
 *   evaluatorNotes: string (optional, max 240 chars),
 *   aiViolations: string[] (optional, for comparison)
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  
  try {
    const body = await req.json().catch(() => null);
    
    if (!body || !body.deviceId || !body.submissionId || !Array.isArray(body.manualViolations)) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const { sessionId, deviceId, submissionId, manualViolations, evaluatorNotes, aiViolations } = body;

    // Validate evaluatorNotes length (240 chars max)
    if (evaluatorNotes && evaluatorNotes.length > 240) {
      return NextResponse.json({ error: "notes_too_long" }, { status: 400 });
    }

    // Get client IP address
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                      req.headers.get("x-real-ip") ||
                      "unknown";

    let currentSessionId = sessionId;

    // If no sessionId provided, create or find existing session for this device
    if (!currentSessionId) {
      // Look for most recent incomplete session for this device
      const { data: existingSession } = await supabase
        .from("evaluation_sessions")
        .select("id")
        .eq("device_id", deviceId)
        .eq("is_complete", false)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (existingSession) {
        currentSessionId = existingSession.id;
      } else {
        // Create new session
        const { data: newSession, error: sessionError } = await supabase
          .from("evaluation_sessions")
          .insert({
            device_id: deviceId,
            ip_address: ipAddress,
          })
          .select("id")
          .single();

        if (sessionError || !newSession) {
          console.error("/api/evaluation/submit: session creation error", sessionError);
          return NextResponse.json({ error: "session_creation_failed" }, { status: 500 });
        }

        currentSessionId = newSession.id;
      }
    }

    // Insert evaluation response
    const { data: response, error: responseError } = await supabase
      .from("evaluation_responses")
      .insert({
        session_id: currentSessionId,
        submission_id: submissionId,
        manual_violations: manualViolations,
        evaluator_notes: evaluatorNotes || null,
        ai_violations: aiViolations || [],
      })
      .select("id")
      .single();

    if (responseError) {
      // Handle duplicate submission in same session
      if (responseError.code === "23505") { // Unique constraint violation
        return NextResponse.json({ error: "duplicate_evaluation" }, { status: 409 });
      }
      console.error("/api/evaluation/submit: response insertion error", responseError);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    // Update session total count
    const { data: sessionData } = await supabase
      .from("evaluation_responses")
      .select("id")
      .eq("session_id", currentSessionId);

    const totalEvaluations = sessionData?.length || 0;

    // Mark session as complete if reached 20 evaluations
    const isComplete = totalEvaluations >= 20;
    const updateData: any = { total_evaluations: totalEvaluations };
    if (isComplete) {
      updateData.is_complete = true;
      updateData.completed_at = new Date().toISOString();
    }

    await supabase
      .from("evaluation_sessions")
      .update(updateData)
      .eq("id", currentSessionId);

    return NextResponse.json({
      ok: true,
      sessionId: currentSessionId,
      responseId: response.id,
      totalEvaluations,
      isComplete,
    });
  } catch (error) {
    console.error("/api/evaluation/submit: error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

