/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/evaluation/results
 * Calculate evaluation metrics comparing AI violations vs manual evaluations
 * Query params:
 *   - sessionId: specific session to analyze (optional)
 *   - includeAggregate: include aggregate stats from all sessions (default: true)
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(req.url);
  
  const sessionId = searchParams.get("sessionId");
  const includeAggregate = searchParams.get("includeAggregate") !== "false";

  try {
    let sessionMetrics = null;

    // Calculate metrics for specific session
    if (sessionId) {
      const { data: responses, error: responsesError } = await supabase
        .from("evaluation_responses")
        .select("manual_violations, ai_violations")
        .eq("session_id", sessionId);

      if (responsesError) {
        console.error("/api/evaluation/results: responses error", responsesError);
        return NextResponse.json({ error: "database_error" }, { status: 500 });
      }

      sessionMetrics = calculateMetrics(responses || []);
    }

    let aggregateMetrics = null;

    // Calculate aggregate metrics from all completed evaluations
    if (includeAggregate) {
      const { data: allResponses, error: allResponsesError } = await supabase
        .from("evaluation_responses")
        .select("manual_violations, ai_violations");

      if (allResponsesError) {
        console.error("/api/evaluation/results: all responses error", allResponsesError);
        return NextResponse.json({ error: "database_error" }, { status: 500 });
      }

      aggregateMetrics = calculateMetrics(allResponses || []);

      // Get total number of evaluations and sessions
      const { data: sessionCount } = await supabase
        .from("evaluation_sessions")
        .select("id", { count: "exact" });

      aggregateMetrics.totalSessions = sessionCount?.length || 0;
    }

    return NextResponse.json({
      sessionMetrics,
      aggregateMetrics,
    });
  } catch (error) {
    console.error("/api/evaluation/results: error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * Calculate precision, recall, and accuracy metrics
 */
function calculateMetrics(responses: Array<{ manual_violations: any; ai_violations: any }>) {
  if (responses.length === 0) {
    return {
      totalEvaluations: 0,
      exactMatches: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      falsePositives: 0,
      falseNegatives: 0,
      truePositives: 0,
      trueNegatives: 0,
    };
  }

  let exactMatches = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  // All possible violation codes
  const allCodes = ["AB001", "AB002", "AB003", "AB004", "AB005", "AB006", "AB007", "AB008"];

  responses.forEach((response) => {
    const manualSet = new Set(
      Array.isArray(response.manual_violations) ? response.manual_violations : []
    );
    const aiSet = new Set(
      Array.isArray(response.ai_violations) ? response.ai_violations : []
    );

    // Check if exact match
    if (
      manualSet.size === aiSet.size &&
      Array.from(manualSet).every((code) => aiSet.has(code))
    ) {
      exactMatches++;
    }

    // Calculate TP, FP, FN, TN for each violation code
    allCodes.forEach((code) => {
      const inManual = manualSet.has(code);
      const inAI = aiSet.has(code);

      if (inManual && inAI) {
        truePositives++;
      } else if (!inManual && inAI) {
        falsePositives++;
      } else if (inManual && !inAI) {
        falseNegatives++;
      } else {
        trueNegatives++;
      }
    });
  });

  const totalEvaluations = responses.length;
  const accuracy = totalEvaluations > 0 ? exactMatches / totalEvaluations : 0;

  // Precision = TP / (TP + FP)
  const precision = truePositives + falsePositives > 0 
    ? truePositives / (truePositives + falsePositives) 
    : 0;

  // Recall = TP / (TP + FN)
  const recall = truePositives + falseNegatives > 0 
    ? truePositives / (truePositives + falseNegatives) 
    : 0;

  return {
    totalEvaluations,
    exactMatches,
    accuracy: Math.round(accuracy * 100 * 100) / 100, // Round to 2 decimals
    precision: Math.round(precision * 100 * 100) / 100,
    recall: Math.round(recall * 100 * 100) / 100,
    falsePositives,
    falseNegatives,
    truePositives,
    trueNegatives,
  };
}

