import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Types
interface Violation {
  code: string;
  title: string;
  rationale: string;
  evidence_span_indices: number[];
  severity: number;
  confidence: number;
}

interface TestResult {
  submissionId: string;
  aiViolations: Violation[];
  manualViolations: Violation[];
  precision: number;
  recall: number;
  f1Score: number;
  falsePositives: number;
  falseNegatives: number;
}

// Direct supabase client
function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL or key missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

const BASELINE_PROMPT = `Role: Political Fundraising Compliance Assistant\n\nInstructions:\n- Accept OCR text and an optional screenshot image of the message. Use BOTH sources: read the text carefully and visually inspect the image when present.\n- Evaluate only for the provided 8 violation codes:\n  AB001: Misrepresentation/Impersonation\n  AB002: Direct-Benefit Claim\n  AB003: Missing Full Entity Name\n  AB004: Entity Clarity (Org vs Candidate)\n  AB005: Branding/Form Clarity\n  AB006: PAC Disclosure Clarity\n  AB007: False/Unsubstantiated Claims\n  AB008: Unverified Matching Program\n\n- Output STRICT JSON with these top-level keys, in order:\n  1. violations (array)\n  2. summary (string)\n  3. overall_confidence (float, 0–1 inclusive)\n- Each violation is returned as a single object with these keys: code (string), title (string), rationale (string), evidence_span_indices (array of integers), severity (int 1–5), confidence (float 0–1 inclusive).\n- Emit at most one violation object per code; if multiple findings, merge rationales and union indices for that code.\n\nSpecific rules and disambiguation:\n- AB001 (Misrepresentation/Impersonation):\n  - Use the screenshot image as evidence. If the image prominently features candidate(s) who are unaffiliated with the sending entity and the text does not clearly state an affiliation to those candidates, RETURN AB001.\n  - Example pattern: image contains Amy Klobuchar, Jamie Raskin, Adam Schiff; text ends with an org name like \"Let America Vote\" without clarifying affiliation — RETURN AB001.\n  - Do NOT return AB001 when the sending entity is that candidate or an affiliated campaign/committee is clearly stated. Do not flag cases where the candidate IS affiliated or when a celebrity lends their likeness (e.g., Beto sending for Powered By People; Bradley Whitford sending for a PAC).\n- AB003 (Missing Full Entity Name): Only flag when NO full entity name appears anywhere in the message. If any full entity name is present (e.g., \"Let America Vote\"), DO NOT return AB003.\n- AB006 (PAC Disclosure Clarity):\n  - AB policy: If the entity is a PAC, contribution forms must make it clear that the donation is going to the PAC (not a candidate).\n  - RETURN AB006 when the sender is a PAC/committee (or the message plausibly represents a PAC) and the copy/branding implies that donations go to a specific candidate or campaign (e.g., \"Joe Biden needs your support — donate now\") without clarifying that funds go to the PAC.\n  - If a full organization name is present but there is no claim of being a PAC and the copy does not imply funds go to a candidate, DO NOT return AB006.\n  - When debating AB001 vs AB006: prefer AB001 for image-based unaffiliated candidate usage; do NOT return AB006 in that case unless the copy additionally misdirects the destination of funds.\n- AB007 & AB008: Merge contributing lines into one object per code.\n\n- All confidence values must be floats (0–1).\n- evidence_span_indices must point to text spans; if the evidence is image-only, use an empty array and explain in the rationale (e.g., \"image shows unaffiliated candidates\").\n- If the message is malformed or incomplete, return: {\"violations\": [], \"summary\": \"Input message is malformed or incomplete.\", \"overall_confidence\": 0.1}\n- If no policy violations are found, return: {\"violations\": [], \"summary\": \"No clear violations.\", \"overall_confidence\": 0.3}\n\nOutput Format:\n- Output JSON only—no commentary or markdown.\n- Structure: { \"violations\": [ ... ], \"summary\": \"...\", \"overall_confidence\": ... }\n- Maintain the exact specified ordering of top-level keys and the strict schema.`;

const TEST_PROMPT = `Role: Political Fundraising Compliance Assistant\n\nInstructions:\n- Accept OCR text and an optional screenshot image of the message. Use BOTH sources: read the text carefully and visually inspect the image when present.\n- Evaluate only for the provided 5 violation codes:\n  AB001: Misrepresentation/Impersonation\n  AB003: Missing Full Entity Name\n  AB004: Entity Clarity (Org vs Candidate)\n  AB007: False/Unsubstantiated Claims\n  AB008: Unverified Matching Program\n\n- Output STRICT JSON with these top-level keys, in order:\n  1. violations (array)\n  2. summary (string)\n  3. overall_confidence (float, 0–1 inclusive)\n- Each violation is returned as a single object with these keys: code (string), title (string), rationale (string), evidence_span_indices (array of integers), severity (int 1–5), confidence (float 0–1 inclusive).\n- Emit at most one violation object per code; if multiple findings, merge rationales and union indices for that code.\n\nSpecific rules and disambiguation:\n- AB001 (Misrepresentation/Impersonation):\n  - Use the screenshot image and body text as evidence. If the image prominently features candidate(s) who are unaffiliated with the sending entity and the text does not clearly state an affiliation to those candidates, RETURN AB001.\n  - Example pattern: image contains Amy Klobuchar, Jamie Raskin, Adam Schiff; text ends with an org name like \"Let America Vote\" without clarifying affiliation — RETURN AB001.\n  - Do NOT return AB001 when the sending entity is that candidate or an affiliated campaign/committee is clearly stated. Do not flag cases where the candidate IS affiliated or when a celebrity lends their likeness (e.g., Beto sending for Powered By People; Bradley Whitford sending for a PAC). Do not flag cases where a politician's image is used to represent the opposition or to attribute a quote or action to them.\n- AB003 (Missing Full Entity Name): Only flag when NO full entity name appears anywhere in the message. If any full entity name is present (e.g., \"Let America Vote\"), DO NOT return AB003.\n- AB007 (False/Unsubstantiated Claims):\n  - Flag only for bullshit gimmicks that trick donors, like fake voting records or insinuating expiration of non-existent memberships/subscriptions. Do NOT flag political rhetoric or news claims.\n\n- AB008 (Unverified Matching Program):\n  - Use when the message advertises a matching program (e.g., \"500% match\").\n  - Rationale text should clearly state that political committees almost never run genuine donor matching programs, and that such claims are highly improbable and misleading to donors.\n  - Do NOT say \"unsupported\" or \"not documented,\" since we cannot know whether documentation exists.\n  - Use direct phrasing such as:\n    \"This solicitation advertises a ‘500%-MATCH.’ Political committees almost never run genuine donor matching programs, making this claim highly improbable and misleading to donors.\"\n- AB007 & AB008: Merge contributing lines into one object per code.\n\n- All confidence values must be floats (0–1).\n- evidence_span_indices must point to text spans; if the evidence is image-only, use an empty array and explain in the rationale (e.g., \"image shows unaffiliated candidates\").\n- If the message is malformed or incomplete, return: {\"violations\": [], \"summary\": \"Input message is malformed or incomplete.\", \"overall_confidence\": 0.1}\n- If no policy violations are found, return: {\"violations\": [], \"summary\": \"No clear violations.\", \"overall_confidence\": 0.3}\n\nOutput Format:\n- Output JSON only—no commentary or markdown.\n- Structure: { \"violations\": [ ... ], \"summary\": \"...\", \"overall_confidence\": ... }\n- Maintain the exact specified ordering of top-level keys and the strict schema.`;

async function testPrompt(submissionId: string, prompt: string): Promise<TestResult | null> {
  const supabase = getSupabaseServer();

  try {
    // Get manual violations
    const { data: benchmark, error: benchmarkError } = await supabase
      .from("evaluation_benchmarks")
      .select("manual_violations")
      .eq("submission_id", submissionId)
      .single();

    if (benchmarkError || !benchmark) return null;

    let manualViolations: Violation[] = [];
    try {
      const violationsData = benchmark.manual_violations;
      if (Array.isArray(violationsData)) {
        manualViolations = violationsData;
      } else if (typeof violationsData === 'string') {
        manualViolations = JSON.parse(violationsData);
      } else if (violationsData === null || violationsData === undefined) {
        manualViolations = [];
      }
    } catch (e) {
      return null;
    }

    if (manualViolations.length === 0) return null;

    // Get submission text
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("raw_text, image_url")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) return null;

    let textContent = submission.raw_text || "";
    if (submission.image_url && submission.image_url.startsWith("http")) {
      textContent = `IMAGE: ${submission.image_url}\n\nTEXT: ${textContent}`;
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    const model = "gpt-4o";

    if (!apiKey) return null;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: textContent }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON (remove markdown if present)
    let jsonContent = content;
    if (content.startsWith('```json')) {
      jsonContent = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonContent);
    const aiViolations = Array.isArray(parsed.violations) ? parsed.violations : [];

    // Log detailed information about mismatches
    const manualCodes = new Set(manualViolations.map((v: Violation) => v.code));
    const aiCodes = new Set(aiViolations.map((v: Violation) => v.code));

    const falsePositives = aiViolations.filter((ai: Violation) => !manualCodes.has(ai.code));
    const falseNegatives = manualViolations.filter((manual: Violation) => !aiCodes.has(manual.code));

    // Always show violations, no confidence levels
    console.log(`    📋 Manual violations: ${manualViolations.map(v => v.code).join(', ') || 'none'}`);
    console.log(`    🤖 AI violations: ${aiViolations.map(v => v.code).join(', ') || 'none'}`);

    if (falsePositives.length > 0 || falseNegatives.length > 0) {
      console.log(`    ❌ MISMATCH: FP=${falsePositives.length}, FN=${falseNegatives.length}`);
    }

    // Calculate metrics (using the sets we already created)
    const truePositives = manualViolations.filter((manual: Violation) =>
      aiViolations.some((ai: Violation) => ai.code === manual.code)
    ).length;

    const falsePositivesCount = aiViolations.filter((ai: Violation) =>
      !manualViolations.some((manual: Violation) => manual.code === ai.code)
    ).length;

    const falseNegativesCount = manualViolations.filter((manual: Violation) =>
      !aiViolations.some((ai: Violation) => ai.code === manual.code)
    ).length;

    const precision = truePositives / (truePositives + falsePositivesCount);
    const recall = truePositives / (truePositives + falseNegativesCount);
    const f1Score = 2 * (precision * recall) / (precision + recall);

    return {
      submissionId,
      aiViolations,
      manualViolations,
      precision: Math.round(precision * 100) / 100,
      recall: Math.round(recall * 100) / 100,
      f1Score: Math.round(f1Score * 100) / 100,
      falsePositives: falsePositivesCount,
      falseNegatives: falseNegativesCount
    };

  } catch (error) {
    console.error(`Error testing submission ${submissionId}:`, error);
    return null;
  }
}

export async function runPromptTest(limit: number = 10): Promise<TestResult[]> {
  const supabase = getSupabaseServer();

  console.log("🚀 Testing prompts against manual evaluations");
  console.log("==============================================");

  // Get evaluation benchmarks
  const { data: benchmarks, error } = await supabase
    .from("evaluation_benchmarks")
    .select("submission_id, manual_violations")
    .not("manual_violations", "is", null)
    .limit(limit);

  if (error || !benchmarks) {
    console.error("❌ Failed to fetch benchmarks:", error);
    return [];
  }

  console.log(`📊 Found ${benchmarks.length} evaluation benchmarks`);

  const results: TestResult[] = [];

  for (const benchmark of benchmarks) {
    console.log(`\n🔍 Testing submission ${benchmark.submission_id}...`);

    // Test baseline prompt
    console.log("  🧪 Baseline prompt...");
    const baselineResult = await testPrompt(benchmark.submission_id, BASELINE_PROMPT);
    if (baselineResult) {
      results.push({ ...baselineResult, submissionId: `${benchmark.submission_id}-baseline` });
      console.log(`    FP: ${baselineResult.falsePositives}, FN: ${baselineResult.falseNegatives}, F1: ${baselineResult.f1Score}`);

      // Show detailed violations for baseline
      console.log("    📋 Manual violations:", baselineResult.manualViolations.map(v => `${v.code}(${v.confidence})`).join(', ') || 'none');
      console.log("    🤖 AI violations:", baselineResult.aiViolations.map(v => `${v.code}(${v.confidence})`).join(', ') || 'none');
    }

    // Test new prompt
    console.log("  🧪 Test prompt...");
    const testResult = await testPrompt(benchmark.submission_id, TEST_PROMPT);
    if (testResult) {
      results.push({ ...testResult, submissionId: `${benchmark.submission_id}-test` });
      console.log(`    FP: ${testResult.falsePositives}, FN: ${testResult.falseNegatives}, F1: ${testResult.f1Score}`);

      // Show detailed violations for test prompt
      console.log("    📋 Manual violations:", testResult.manualViolations.map(v => `${v.code}(${v.confidence})`).join(', ') || 'none');
      console.log("    🤖 AI violations:", testResult.aiViolations.map(v => `${v.code}(${v.confidence})`).join(', ') || 'none');
    }
  }

  // Summary
  console.log("\n📊 SUMMARY");
  console.log("==========");

  const baselineResults = results.filter(r => r.submissionId.includes('-baseline'));
  const testResults = results.filter(r => r.submissionId.includes('-test'));

  const avgBaselineFP = baselineResults.reduce((sum, r) => sum + r.falsePositives, 0) / baselineResults.length;
  const avgTestFP = testResults.reduce((sum, r) => sum + r.falsePositives, 0) / testResults.length;
  const avgBaselineF1 = baselineResults.reduce((sum, r) => sum + r.f1Score, 0) / baselineResults.length;
  const avgTestF1 = testResults.reduce((sum, r) => sum + r.f1Score, 0) / testResults.length;

  console.log(`\n📊 SUMMARY:`);
  console.log(`Baseline violations matched: ${baselineResults.filter(r => r.falsePositives === 0 && r.falseNegatives === 0).length}/${baselineResults.length}`);
  console.log(`Test violations matched: ${testResults.filter(r => r.falsePositives === 0 && r.falseNegatives === 0).length}/${testResults.length}`);

  const testIsBetter = testResults.filter(r => r.falsePositives === 0 && r.falseNegatives === 0).length >= baselineResults.filter(r => r.falsePositives === 0 && r.falseNegatives === 0).length;
  console.log(testIsBetter ? "✅ TEST PROMPT IS BETTER" : "❌ Test prompt needs improvement");

  return results;
}
