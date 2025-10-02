/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/evaluation/samples
 * Returns random submissions with AI-detected violations for evaluation
 * Query params:
 *   - count: number of samples to return (default: 20)
 *   - exclude: comma-separated submission IDs to exclude (already evaluated)
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { searchParams } = new URL(req.url);
  
  const count = Math.min(50, Math.max(1, parseInt(searchParams.get("count") || "20", 10)));
  const excludeParam = searchParams.get("exclude") || "";
  const excludeIds = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

  try {
    // Get random submissions that are completed and public
    let query = supabase
      .from("submissions")
      .select("id, image_url, sender_id, sender_name, raw_text, message_type, ai_confidence, created_at, landing_url, landing_screenshot_url")
      .eq("processing_status", "done")
      .eq("public", true)
      .not("raw_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(200); // Get more than needed for randomization

    if (excludeIds.length > 0) {
      query = query.not("id", "in", `(${excludeIds.join(",")})`);
    }

    const { data: submissions, error: submissionsError } = await query;

    if (submissionsError) {
      console.error("/api/evaluation/samples: submissions error", submissionsError);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ samples: [] });
    }

    // Prioritize submissions with valid image URLs
    const withImages = submissions.filter(
      (sub) => sub.image_url && sub.image_url.startsWith("http")
    );
    const withoutImages = submissions.filter(
      (sub) => !sub.image_url || !sub.image_url.startsWith("http")
    );

    // Shuffle each group separately
    const shuffledWithImages = withImages.sort(() => Math.random() - 0.5);
    const shuffledWithoutImages = withoutImages.sort(() => Math.random() - 0.5);

    // Prioritize image submissions, then add ones without images if needed
    const submissionsToUse = [...shuffledWithImages, ...shuffledWithoutImages].slice(0, count);
    const submissionIds = submissionsToUse.map((s) => s.id);

    // Get violations for these submissions
    const { data: violations, error: violationsError } = await supabase
      .from("violations")
      .select("submission_id, code, title, description, confidence")
      .in("submission_id", submissionIds);

    if (violationsError) {
      console.error("/api/evaluation/samples: violations error", violationsError);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    // Group violations by submission
    const violationsBySubmission: Record<string, any[]> = {};
    (violations || []).forEach((v) => {
      if (!violationsBySubmission[v.submission_id]) {
        violationsBySubmission[v.submission_id] = [];
      }
      violationsBySubmission[v.submission_id].push({
        code: v.code,
        title: v.title,
        description: v.description,
        confidence: v.confidence,
      });
    });

    // Combine data
    const samples = submissionsToUse.map((sub) => ({
      id: sub.id,
      imageUrl: sub.image_url,
      senderId: sub.sender_id,
      senderName: sub.sender_name,
      rawText: sub.raw_text,
      messageType: sub.message_type,
      aiConfidence: sub.ai_confidence,
      createdAt: sub.created_at,
      landingUrl: sub.landing_url,
      landingScreenshotUrl: sub.landing_screenshot_url,
      aiViolations: violationsBySubmission[sub.id] || [],
    }));

    return NextResponse.json({ samples });
  } catch (error) {
    console.error("/api/evaluation/samples: error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

