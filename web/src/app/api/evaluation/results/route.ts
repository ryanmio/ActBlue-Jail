import { getSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getSupabaseServer();

  try {
    // Get all evaluation benchmarks with their corresponding violations
    const { data: evaluations, error } = await supabase
      .from("evaluation_benchmarks")
      .select(`
        id,
        submission_id,
        manual_violations,
        evaluator_notes,
        created_at,
        updated_at,
        submissions!inner (
          id,
          raw_text,
          image_url,
          sender_name,
          violations (
            id,
            code,
            title,
            description,
            confidence,
            severity
          )
        )
      `);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate metrics
    const metrics = {
      totalEvaluations: evaluations?.length || 0,
      aiViolations: 0,
      manualViolations: 0,
      truePositives: 0,
      falsePositives: 0,
      trueNegatives: 0,
      falseNegatives: 0,
      violationsByCode: {} as Record<string, { aiCount: number; manualCount: number; correctCount: number; incorrectCount: number }>,
    };

    evaluations?.forEach((evalRecord: any) => {
      const aiViolations = evalRecord.submissions.violations || [];
      const manualViolations = evalRecord.manual_violations || [];

      metrics.aiViolations += aiViolations.length;
      metrics.manualViolations += manualViolations.length;

      // Track violations by code
      aiViolations.forEach((aiViolation: any) => {
        const code = aiViolation.code;
        if (!metrics.violationsByCode[code]) {
          metrics.violationsByCode[code] = { aiCount: 0, manualCount: 0, correctCount: 0, incorrectCount: 0 };
        }
        metrics.violationsByCode[code].aiCount++;
      });

      manualViolations.forEach((manualViolation: any) => {
        const code = manualViolation.code;
        if (!metrics.violationsByCode[code]) {
          metrics.violationsByCode[code] = { aiCount: 0, manualCount: 0, correctCount: 0, incorrectCount: 0 };
        }
        metrics.violationsByCode[code].manualCount++;
      });

      // Calculate accuracy for each violation code
      aiViolations.forEach((aiViolation: any) => {
        const hasManualMatch = manualViolations.some((manualViolation: any) =>
          manualViolation.code === aiViolation.code
        );

        if (hasManualMatch) {
          metrics.violationsByCode[aiViolation.code].correctCount++;
          metrics.truePositives++;
        } else {
          metrics.violationsByCode[aiViolation.code].incorrectCount++;
          metrics.falsePositives++;
        }
      });

      manualViolations.forEach((manualViolation: any) => {
        const hasAiMatch = aiViolations.some((aiViolation: any) =>
          aiViolation.code === manualViolation.code
        );

        if (!hasAiMatch) {
          metrics.falseNegatives++;
        }
      });
    });

    // Calculate precision, recall, and F1 score
    const precision = metrics.aiViolations > 0 ? metrics.truePositives / metrics.aiViolations : 0;
    const recall = metrics.manualViolations > 0 ? metrics.truePositives / metrics.manualViolations : 0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const results = {
      metrics: {
        ...metrics,
        precision,
        recall,
        f1Score,
      },
      evaluations,
    };

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
