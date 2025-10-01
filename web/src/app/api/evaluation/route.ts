import { getSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const includeEvaluated = searchParams.get("includeEvaluated") === "true";

  try {
    // Get submissions with violations, prioritizing AB007 (False/Unsubstantiated Claims)
    let query = supabase
      .from("submissions")
      .select(`
        id,
        raw_text,
        image_url,
        sender_name,
        created_at,
        violations (
          id,
          code,
          title,
          description,
          confidence,
          severity
        )
      `)
      .not("raw_text", "is", null)
      .not("raw_text", "eq", "")
      .gte("violations.confidence", 0.5) // Include all violations with confidence > 0.5
      .order("created_at", { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    // Include evaluated submissions so users can continue evaluating them
    // and see their progress through the evaluation set

    const { data: submissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get evaluation progress information
    const { data: allEvaluations } = await supabase
      .from("evaluation_benchmarks")
      .select("id");

    const totalEvaluated = allEvaluations?.length || 0;
    const totalAvailable = submissions?.length || 0;

    // Prioritize submissions with AB007 violations
    const prioritized = submissions?.sort((a, b) => {
      const aHasAB007 = a.violations?.some((v: any) => v.code === "AB007");
      const bHasAB007 = b.violations?.some((v: any) => v.code === "AB007");
      if (aHasAB007 && !bHasAB007) return -1;
      if (!aHasAB007 && bHasAB007) return 1;
      return 0;
    }) || [];

    return NextResponse.json({
      submissions: prioritized,
      progress: {
        totalEvaluated,
        totalAvailable,
        completionPercentage: totalAvailable > 0 ? Math.round((totalEvaluated / totalAvailable) * 100) : 0,
        isComplete: totalEvaluated >= totalAvailable && totalAvailable > 0
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServer();

  try {
    const body = await request.json();
    const { submissionId, manualViolations, evaluatorNotes } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    // Validate manualViolations structure
    if (!Array.isArray(manualViolations)) {
      return NextResponse.json({ error: "manualViolations must be an array" }, { status: 400 });
    }

    // Check if evaluation already exists
    const { data: existing } = await supabase
      .from("evaluation_benchmarks")
      .select("id")
      .eq("submission_id", submissionId)
      .single();

    if (existing) {
      // Update existing evaluation
      const { error } = await supabase
        .from("evaluation_benchmarks")
        .update({
          manual_violations: manualViolations,
          evaluator_notes: evaluatorNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("submission_id", submissionId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Create new evaluation
      const { error } = await supabase
        .from("evaluation_benchmarks")
        .insert({
          submission_id: submissionId,
          manual_violations: manualViolations,
          evaluator_notes: evaluatorNotes,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
