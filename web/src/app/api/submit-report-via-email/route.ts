import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  console.log("/api/submit-report-via-email:start");
  
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      renderErrorPage("Invalid Link", "This link is missing required parameters."),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  const supabase = getSupabaseServer();

  // Find submission by token
  const { data: rows, error: err } = await supabase
    .from("submissions")
    .select("id, landing_url, token_used_at")
    .eq("submission_token", token)
    .limit(1);

  if (err || !rows?.[0]) {
    console.error("/api/submit-report-via-email:error not_found", { token: token.slice(0, 10) });
    return new NextResponse(
      renderErrorPage("Case Not Found", "This submission link is invalid or has expired."),
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  const sub = rows[0] as { id: string; landing_url?: string | null; token_used_at?: string | null };

  // Check if token already used
  if (sub.token_used_at) {
    console.log("/api/submit-report-via-email:already_used", { id: sub.id, usedAt: sub.token_used_at });
    const caseUrl = `${env.NEXT_PUBLIC_SITE_URL}/cases/${sub.id}`;
    return new NextResponse(
      renderInfoPage(
        "Already Submitted",
        "This report has already been submitted to ActBlue.",
        caseUrl
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Check if landing URL exists
  if (!sub.landing_url) {
    console.error("/api/submit-report-via-email:error missing_landing_url", { id: sub.id });
    const caseUrl = `${env.NEXT_PUBLIC_SITE_URL}/cases/${sub.id}`;
    return new NextResponse(
      renderErrorPage(
        "Missing Landing Page",
        "This case does not have a landing page URL. Please visit the case page to add one before submitting.",
        caseUrl
      ),
      {
        status: 400,
        headers: { "Content-Type": "text/html" },
      }
    );
  }

  // Mark token as used immediately to prevent double-submissions
  await supabase
    .from("submissions")
    .update({ token_used_at: new Date().toISOString() })
    .eq("id", sub.id);

  // Call the report-violation endpoint internally
  try {
    const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const reportRes = await fetch(`${base}/api/report-violation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId: sub.id,
        landingUrl: sub.landing_url,
      }),
    });

    if (!reportRes.ok) {
      const errData = await reportRes.json().catch(() => ({}));
      console.error("/api/submit-report-via-email:report_failed", { id: sub.id, status: reportRes.status, error: errData });
      
      const caseUrl = `${env.NEXT_PUBLIC_SITE_URL}/cases/${sub.id}`;
      return new NextResponse(
        renderErrorPage(
          "Submission Failed",
          "Failed to submit report to ActBlue. Please try again from the case page.",
          caseUrl
        ),
        {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    console.log("/api/submit-report-via-email:success", { id: sub.id });
    const caseUrl = `${env.NEXT_PUBLIC_SITE_URL}/cases/${sub.id}`;
    return new NextResponse(
      renderSuccessPage(sub.id, caseUrl),
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (e) {
    console.error("/api/submit-report-via-email:exception", e);
    const caseUrl = `${env.NEXT_PUBLIC_SITE_URL}/cases/${sub.id}`;
    return new NextResponse(
      renderErrorPage(
        "Submission Error",
        "An unexpected error occurred. Please try again from the case page.",
        caseUrl
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

function renderSuccessPage(caseId: string, caseUrl: string): string {
  const shortId = caseId.split("-")[0];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Submitted - AB Jail</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .checkmark {
      width: 40px;
      height: 40px;
      border: 4px solid white;
      border-radius: 50%;
      border-left-color: transparent;
      border-top-color: transparent;
      transform: rotate(45deg);
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #475569;
      margin-bottom: 24px;
      font-size: 16px;
    }
    .case-id {
      background: #f1f5f9;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      color: #334155;
      margin-bottom: 32px;
    }
    a {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59,130,246,0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <div class="checkmark"></div>
    </div>
    <h1>Report Submitted!</h1>
    <p>Your report has been successfully submitted to ActBlue. They will review the case and take appropriate action.</p>
    <div class="case-id">Case #${shortId}</div>
    <a href="${caseUrl}">View Case Details</a>
  </div>
</body>
</html>`;
}

function renderErrorPage(title: string, message: string, caseUrl?: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - AB Jail</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #475569;
      margin-bottom: 32px;
      font-size: 16px;
    }
    a {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59,130,246,0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${caseUrl ? `<a href="${caseUrl}">Go to Case Page</a>` : `<a href="/">Go to Homepage</a>`}
  </div>
</body>
</html>`;
}

function renderInfoPage(title: string, message: string, caseUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - AB Jail</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      color: #0f172a;
      margin-bottom: 12px;
      font-weight: 700;
    }
    p {
      color: #475569;
      margin-bottom: 32px;
      font-size: 16px;
    }
    a {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #1e40af);
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(59,130,246,0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">ℹ️</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${caseUrl}">View Case Details</a>
  </div>
</body>
</html>`;
}

