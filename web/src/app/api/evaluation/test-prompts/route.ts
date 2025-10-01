import { NextRequest, NextResponse } from "next/server";
import { runAllPromptTests, promptVariations, PromptVariation, runPromptTest } from "@/server/evaluation/prompt-tester";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 50); // Max 50 to prevent excessive costs

    console.log(`🚀 Starting prompt testing against evaluation benchmarks (limit: ${limit})...`);

    // Run all prompt variations against the evaluation set
    const results = await runAllPromptTests(limit);

    if (results.length === 0) {
      return NextResponse.json({
        error: "No evaluation benchmarks found. Please complete some manual evaluations first.",
        results: []
      }, { status: 400 });
    }

    // Aggregate results by prompt version
    const promptResults = new Map<string, {
      name: string;
      description: string;
      totalTests: number;
      correctTests: number;
      totalPrecision: number;
      totalRecall: number;
      totalF1Score: number;
      averagePrecision: number;
      averageRecall: number;
      averageF1Score: number;
      falsePositives: number;
      falseNegatives: number;
    }>();

    // Initialize prompt results
    promptVariations.forEach(prompt => {
      promptResults.set(prompt.id, {
        name: prompt.name,
        description: prompt.description,
        totalTests: 0,
        correctTests: 0,
        totalPrecision: 0,
        totalRecall: 0,
        totalF1Score: 0,
        averagePrecision: 0,
        averageRecall: 0,
        averageF1Score: 0,
        falsePositives: 0,
        falseNegatives: 0,
      });
    });

    // Aggregate metrics
    results.forEach(result => {
      const promptData = promptResults.get(result.promptVersion);
      if (promptData) {
        promptData.totalTests++;
        if (result.isCorrect) promptData.correctTests++;
        promptData.totalPrecision += result.precision;
        promptData.totalRecall += result.recall;
        promptData.totalF1Score += result.f1Score;

        // Count false positives and negatives
        const aiViolationCodes = result.aiViolations.map(v => v.code);
        const manualViolationCodes = result.manualViolations.map(v => v.code);

        aiViolationCodes.forEach(code => {
          if (!manualViolationCodes.includes(code)) {
            promptData.falsePositives++;
          }
        });

        manualViolationCodes.forEach(code => {
          if (!aiViolationCodes.includes(code)) {
            promptData.falseNegatives++;
          }
        });
      }
    });

    // Calculate averages
    promptResults.forEach(promptData => {
      if (promptData.totalTests > 0) {
        promptData.averagePrecision = promptData.totalPrecision / promptData.totalTests;
        promptData.averageRecall = promptData.totalRecall / promptData.totalTests;
        promptData.averageF1Score = promptData.totalF1Score / promptData.totalTests;
      }
    });

    // Sort prompts by F1 score (best first)
    const sortedPrompts = Array.from(promptResults.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.averageF1Score - a.averageF1Score);

    console.log(`✅ Completed testing ${results.length} prompt variations across ${promptVariations.length} prompts`);

    return NextResponse.json({
      summary: {
        totalTests: results.length,
        promptsTested: promptVariations.length,
        bestPrompt: sortedPrompts[0]?.name,
        bestF1Score: sortedPrompts[0]?.averageF1Score
      },
      promptResults: sortedPrompts,
      individualResults: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error running prompt tests:", error);
    return NextResponse.json({
      error: "Failed to run prompt tests",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId, submissionIds } = body;

    if (!promptId || !submissionIds || !Array.isArray(submissionIds)) {
      return NextResponse.json({
        error: "promptId and submissionIds (array) are required"
      }, { status: 400 });
    }

    const promptVariation = promptVariations.find(p => p.id === promptId);
    if (!promptVariation) {
      return NextResponse.json({
        error: `Prompt variation '${promptId}' not found`
      }, { status: 400 });
    }

    console.log(`🧪 Testing prompt '${promptVariation.name}' on ${submissionIds.length} submissions...`);

    const results = [];
    for (const submissionId of submissionIds) {
      const result = await runPromptTest(submissionId, promptVariation);
      if (result) {
        results.push(result);
      }
    }

    const correctTests = results.filter(r => r.isCorrect).length;
    const averagePrecision = results.reduce((sum, r) => sum + r.precision, 0) / results.length;
    const averageRecall = results.reduce((sum, r) => sum + r.recall, 0) / results.length;
    const averageF1Score = results.reduce((sum, r) => sum + r.f1Score, 0) / results.length;

    return NextResponse.json({
      promptId,
      promptName: promptVariation.name,
      promptDescription: promptVariation.description,
      totalTests: results.length,
      correctTests,
      accuracy: results.length > 0 ? correctTests / results.length : 0,
      averagePrecision,
      averageRecall,
      averageF1Score,
      results
    });

  } catch (error) {
    console.error("❌ Error running custom prompt test:", error);
    return NextResponse.json({
      error: "Failed to run prompt test",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
