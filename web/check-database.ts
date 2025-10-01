#!/usr/bin/env tsx
/**
 * Simple script to check database status and submission counts
 * Run with: npx tsx check-database.ts
 */

import { config } from "dotenv";
import { join } from "path";
import { fileURLToPath } from "url";

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

async function checkDatabase() {
  try {
    console.log("🔍 Checking database status...\n");

    const supabase = getSupabaseServer();

    // Check submissions count
    const { data: submissions, error: subError } = await supabase
      .from("submissions")
      .select("id, raw_text, created_at")
      .limit(5);

    if (subError) {
      console.error("❌ Error accessing submissions:", subError.message);
      console.log("\n🔧 You need to set up your environment variables:");
      console.log("1. Copy env.example to .env.local");
      console.log("2. Fill in your Supabase credentials");
      console.log("3. Run the database migrations");
      return;
    }

    console.log(`✅ Found ${submissions?.length || 0} submissions in database`);

    // Check for submissions with violations
    const { data: submissionsWithViolations, error: vioError } = await supabase
      .from("submissions")
      .select(`
        id,
        raw_text,
        violations (
          id,
          code,
          confidence
        )
      `)
      .not("raw_text", "is", null)
      .not("raw_text", "eq", "")
      .gte("violations.confidence", 0.5)
      .limit(10);

    if (vioError) {
      console.error("❌ Error checking violations:", vioError.message);
      return;
    }

    const totalWithViolations = submissionsWithViolations?.length || 0;
    const ab007Count = submissionsWithViolations?.filter(s =>
      s.violations?.some(v => v.code === "AB007")
    ).length || 0;

    console.log(`✅ Found ${totalWithViolations} submissions with high-confidence violations`);
    console.log(`✅ Found ${ab007Count} submissions with AB007 violations (>=70% confidence)`);

    // Check AB007 confidence levels with lower threshold
    const { data: ab007ViolationsLower } = await supabase
      .from("violations")
      .select("confidence, submission_id")
      .eq("code", "AB007")
      .gte("confidence", 0.5);

    const mediumConfCount = ab007ViolationsLower?.length || 0;
    const highConfCount = ab007ViolationsLower?.filter(v => v.confidence >= 0.7).length || 0;

    console.log(`✅ Found ${mediumConfCount} submissions with AB007 violations (>=50% confidence)`);

    if (mediumConfCount > 0) {
      console.log(`📈 AB007 confidence breakdown:`);
      console.log(`   High confidence (>=70%): ${highConfCount}`);
      console.log(`   Medium confidence (50-69%): ${mediumConfCount - highConfCount}`);
      console.log(`   Available for evaluation: ${mediumConfCount}`);
    }

    // Check AB007 confidence levels
    if (ab007Count > 0) {
      const { data: ab007Violations } = await supabase
        .from("violations")
        .select("confidence, submission_id")
        .eq("code", "AB007");

      if (ab007Violations) {
        const highConf = ab007Violations.filter(v => v.confidence >= 0.7).length;
        const lowConf = ab007Violations.length - highConf;

        console.log(`📈 AB007 confidence breakdown:`);
        console.log(`   High confidence (>=70%): ${highConf}`);
        console.log(`   Lower confidence (<70%): ${lowConf}`);

        if (highConf === 0) {
          console.log(`💡 No AB007 violations with >=70% confidence for evaluation.`);
          console.log(`   Consider lowering the confidence threshold in the evaluation system.`);
        }
      }
    }

    // Check what violation types exist
    const { data: allViolations, error: vioTypesError } = await supabase
      .from("violations")
      .select("code, title")
      .limit(20);

    if (allViolations && allViolations.length > 0) {
      const violationCounts = new Map();
      allViolations.forEach(v => {
        violationCounts.set(v.code, (violationCounts.get(v.code) || 0) + 1);
      });

      console.log("\n📊 Current violation types:");
      violationCounts.forEach((count, code) => {
        const violation = allViolations.find(v => v.code === code);
        console.log(`   ${code}: ${violation?.title} (${count} instances)`);
      });
    }

    // Check evaluation benchmarks table
    const { data: benchmarks, error: benchError } = await supabase
      .from("evaluation_benchmarks")
      .select("id, submission_id")
      .limit(20);

    if (benchError) {
      console.log("❌ Evaluation benchmarks table doesn't exist yet");
      console.log("💡 Run this SQL in your Supabase dashboard:");
      console.log("   cat sql/2025-09-23_add_evaluation_benchmarks.sql | psql [your-db]");
    } else {
      console.log("✅ Evaluation benchmarks table exists");
      console.log(`✅ Found ${benchmarks?.length || 0} evaluation records`);

      if (benchmarks && benchmarks.length > 0) {
        const ab007Benchmarks = benchmarks.filter(b =>
          b.submission_id && submissionsWithViolations?.some(s =>
            s.id === b.submission_id && s.violations?.some(v => v.code === "AB007")
          )
        ).length;
        console.log(`✅ ${ab007Benchmarks} AB007 submissions in evaluation queue`);
      }
    }

    if (ab007Count === 0) {
      console.log("\n📝 No AB007 violations found for evaluation.");
      console.log("💡 This could mean:");
      console.log("   - No submissions have been classified yet");
      console.log("   - The classification confidence is below 70%");
      console.log("   - Try running the classification API on some submissions first");
    } else {
      console.log("\n🎯 Ready for evaluation! Visit /evaluation in your browser");
    }

  } catch (error) {
    console.error("❌ Database connection error:", error);
    console.log("\n🔧 Setup needed:");
    console.log("1. Create .env.local file with your Supabase credentials");
    console.log("2. Run database migrations");
    console.log("3. Ensure submissions exist in the database");
  }
}

checkDatabase().catch(console.error);
