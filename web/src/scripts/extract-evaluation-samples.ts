#!/usr/bin/env tsx
/**
 * Script to extract sample submissions with AB007 violations for evaluation
 * Run with: npx tsx src/scripts/extract-evaluation-samples.ts
 */

import { config } from "dotenv";
import { join } from "path";

// Load environment variables
config({ path: join(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

// Direct supabase client creation for this script
function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL or key missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function extractEvaluationSamples() {
  const supabase = getSupabaseServer();

  console.log("Extracting evaluation samples...");

  // Get submissions with high-confidence AB007 violations
  const { data: submissions, error } = await supabase
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
    .gte("violations.confidence", 0.5)
    .eq("violations.code", "AB007")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching submissions:", error);
    return;
  }

  console.log(`Found ${submissions?.length || 0} submissions with high-confidence AB007 violations\n`);

  // Group by different patterns to ensure variety
  const urgentDeadlines: any[] = [];
  const hyperbolicClaims: any[] = [];
  const impossibleNumbers: any[] = [];
  const legalMisrepresentations: any[] = [];
  const otherAB007: any[] = [];

  submissions?.forEach((submission: any) => {
    const text = submission.raw_text?.toLowerCase() || "";

    if (text.includes("deadline") || text.includes("expires") || text.includes("urgent") || text.includes("hours")) {
      urgentDeadlines.push(submission);
    } else if (text.includes("most important") || text.includes("critical") || text.includes("historic") || text.includes("unprecedented")) {
      hyperbolicClaims.push(submission);
    } else if (text.includes("100%") || text.includes("200%") || text.includes("500%") || text.includes("match")) {
      impossibleNumbers.push(submission);
    } else if (text.includes("tax") || text.includes("deductible") || text.includes("legal")) {
      legalMisrepresentations.push(submission);
    } else {
      otherAB007.push(submission);
    }
  });

  console.log("Sample distribution:");
  console.log(`- Urgent Deadlines: ${urgentDeadlines.length}`);
  console.log(`- Hyperbolic Claims: ${hyperbolicClaims.length}`);
  console.log(`- Impossible Numbers: ${impossibleNumbers.length}`);
  console.log(`- Legal Misrepresentations: ${legalMisrepresentations.length}`);
  console.log(`- Other AB007: ${otherAB007.length}\n`);

  // Select diverse samples (2-3 from each category)
  const selectedSamples: any[] = [
    ...urgentDeadlines.slice(0, 3),
    ...hyperbolicClaims.slice(0, 3),
    ...impossibleNumbers.slice(0, 3),
    ...legalMisrepresentations.slice(0, 3),
    ...otherAB007.slice(0, 6),
  ];

  console.log("Selected samples for evaluation:");
  console.log("================================\n");

  selectedSamples.forEach((submission, index) => {
    console.log(`${index + 1}. Submission ID: ${submission.id}`);
    console.log(`   Sender: ${submission.sender_name || "Unknown"}`);
    console.log(`   Created: ${new Date(submission.created_at).toLocaleDateString()}`);
    console.log(`   AB007 Violations: ${submission.violations?.length || 0}`);

    submission.violations?.forEach((violation: any, vIndex: number) => {
      console.log(`     ${vIndex + 1}. "${violation.description}" (confidence: ${Math.round(violation.confidence * 100)}%)`);
    });

    console.log(`   Text Preview: ${submission.raw_text?.substring(0, 200)}${submission.raw_text?.length > 200 ? "..." : ""}\n`);
  });

  console.log(`\nTotal selected: ${selectedSamples.length} submissions`);
  console.log("\nTo evaluate these submissions:");
  console.log("1. Visit /evaluation in your browser");
  console.log("2. Review each submission and manually tag violations");
  console.log("3. Save your evaluations to build the benchmark dataset");

  // Optional: Insert these as evaluation benchmarks without manual violations
  // (so they show up in the evaluation queue)
  if (process.argv.includes("--insert")) {
    console.log("\nInserting samples into evaluation queue...");

    for (const submission of selectedSamples) {
      await supabase
        .from("evaluation_benchmarks")
        .insert({
          submission_id: submission.id,
          manual_violations: [],
          evaluator_notes: "Sample for prompt evaluation",
        });
    }

    console.log(`Inserted ${selectedSamples.length} samples into evaluation queue`);
  }
}

extractEvaluationSamples().catch(console.error);
