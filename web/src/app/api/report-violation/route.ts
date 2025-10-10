import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase-server";

function parseSupabaseUrl(u: string | null | undefined) {
  if (!u || !u.startsWith("supabase://")) return null;
  const rest = u.replace("supabase://", "");
  const [bucket, ...pathParts] = rest.split("/");
  const path = pathParts.join("/");
  return { bucket, path };
}

export async function POST(req: NextRequest) {
  if (!env.RESEND_API_KEY) return NextResponse.json({ error: "resend_key_missing" }, { status: 400 });
  const resend = new Resend(env.RESEND_API_KEY);
  const supabase = getSupabaseServer();

  type Body = { caseId?: string; landingUrl?: string | null; ccEmail?: string | null; note?: string | null; violationsOverride?: string | null };
  const input = (await req.json().catch(() => null)) as Body | null;
  const violationsOverride = (input?.violationsOverride || "").trim();
  const caseId = (input?.caseId || "").trim();
  const ccEmail = (input?.ccEmail || "").trim() || null;
  const landingUrlFromUser = (input?.landingUrl || "").trim() || null;
  const reporterNote = (input?.note || "").trim();
  if (!caseId) return NextResponse.json({ error: "missing_case_id" }, { status: 400 });

  if (!env.REPORT_EMAIL_TO) return NextResponse.json({ error: "missing_report_to" }, { status: 400 });
  if (!env.REPORT_EMAIL_FROM) return NextResponse.json({ error: "missing_report_from" }, { status: 400 });

  // Fetch case
  const { data: rows, error: err } = await supabase
    .from("submissions")
    .select("id, sender_name, sender_id, raw_text, email_subject, email_body, ai_summary, image_url, landing_url, landing_screenshot_url, message_type")
    .eq("id", caseId)
    .limit(1);
  if (err) return NextResponse.json({ error: "case_load_failed" }, { status: 500 });
  const sub = rows?.[0] as
    | { id: string; sender_name?: string | null; sender_id?: string | null; raw_text?: string | null; email_body?: string | null; landing_url?: string | null; landing_screenshot_url?: string | null; image_url?: string | null; message_type?: string | null }
    | undefined;
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const landingUrlRaw = sub.landing_url || landingUrlFromUser;
  const landingUrl = landingUrlRaw ? (() => { try { const u = new URL(landingUrlRaw); return `${u.origin}${u.pathname}`; } catch { return landingUrlRaw; } })() : null;
  if (!landingUrl) return NextResponse.json({ error: "landing_url_required" }, { status: 400 });

  // Build subject/body
  const shortId = sub.id.split("-")[0];
  const subject = `Reporting Possible Violation - Case #${shortId}`;
  const campaign = sub.sender_name || sub.sender_id || "(unknown sender)";

  // Determine evidence type: Email HTML vs Screenshot
  const isEmailSubmission = sub.message_type === 'email' && sub.email_body;
  let evidenceUrl: string | null = null;
  let evidenceLabel = "Screenshot";
  let evidenceLinkText = "View Screenshot";

  if (isEmailSubmission) {
    // Email submission: link to email HTML viewer
    evidenceUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/cases/${sub.id}/email-html`;
    evidenceLabel = "Email HTML";
    evidenceLinkText = "The email I received is linked here";
  } else {
    // Screenshot/paste submission: get screenshot URL
    let screenshotUrl: string | null = sub.image_url || null;
    if (screenshotUrl && !screenshotUrl.startsWith("http")) {
      const parsed = parseSupabaseUrl(screenshotUrl);
      if (parsed) {
        try {
          const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
          screenshotUrl = signed?.signedUrl || screenshotUrl;
        } catch {}
      }
    }
    evidenceUrl = screenshotUrl;
  }

  // Load violations for this case
  const { data: vioRows } = await supabase
    .from("violations")
    .select("code, title, description, severity, confidence")
    .eq("submission_id", sub.id)
    .order("severity", { ascending: false });
  const violationsList = Array.isArray(vioRows) ? vioRows : [];

  // No summary in email/report body per product decision

  // Nicely formatted plaintext body
  const sections: string[] = [];
  sections.push(`Campaign/Org\n-----------\n${campaign}`);
  // Build violations section (override → list aware)
  let vioText: string;
  if (violationsOverride) {
    const ovLines = String(violationsOverride)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => l.replace(/^[-\u2022]\s*/, ""));
    if (ovLines.length > 1) {
      vioText = ovLines.map((l) => `- ${l}`).join("\n");
    } else {
      vioText = ovLines[0] || "";
    }
  } else {
    vioText = (violationsList.length > 0
      ? violationsList.map((v: { code: string; title: string; description?: string | null }) => `- ${v.code} ${v.title}${v.description ? `: ${v.description}` : ""}`).join("\n")
      : "(none detected)");
  }
  sections.push(`Violations\n----------\n${vioText}`);
  sections.push(`Landing page URL\n-----------------\n${landingUrl}`);
  if (reporterNote) sections.push(`Reporter note\n-------------\n${reporterNote}`);
  if (evidenceUrl) sections.push(`${evidenceLabel}\n---------\n${evidenceUrl}`);
  sections.push(`Meta\n----\nThis report was submitted using AB Jail.\nCase UUID: ${sub.id}\nCase short_id: ${shortId}`);
  const body = sections.join("\n\n");

  // Beautiful HTML email matching preview email design
  const esc = (s: string) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const vioHtml = (() => {
    if (violationsOverride) {
      const ovLines = String(violationsOverride)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => l.replace(/^[-\u2022]\s*/, ""));
      if (ovLines.length > 1) {
        return `<ul style="margin:0;padding-left:20px">${ovLines.map((l) => `<li style="margin:4px 0">${esc(l)}</li>`).join("")}</ul>`;
      }
      return `<p style="margin:0">${esc(ovLines[0] || "")}</p>`;
    }
    return (violationsList.length > 0)
      ? `<ul style="margin:0;padding-left:20px">${violationsList.map((v: { code: string; title: string; description?: string | null }) => `<li style="margin:4px 0"><strong>${esc(v.code)}</strong> ${esc(v.title)}${v.description ? `: ${esc(v.description)}` : ""}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">(No violations detected)</p>`;
  })();
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.5;color:#0f172a;margin:0;padding:0;background-color:#f8fafc">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="margin:0;font-size:24px;font-weight:700">ActBlue Violation Report</h1>
      <p style="margin:8px 0 0 0;opacity:0.9;font-size:14px">Case #${esc(shortId)}</p>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <!-- Campaign/Org -->
      <div style="margin-bottom:20px">
        <h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Campaign/Organization</h2>
        <p style="margin:0;font-size:16px;font-weight:500;color:#0f172a">${esc(campaign)}</p>
      </div>

      <!-- Violations -->
      <div style="margin-bottom:20px">
        <h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Violations</h2>
        ${vioHtml}
      </div>

      <!-- Landing Page -->
      <div style="margin-bottom:20px">
        <h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Landing Page</h2>
        <p style="margin:0;font-size:14px"><a href="${esc(landingUrl)}" style="color:#3b82f6;text-decoration:underline" target="_blank" rel="noopener noreferrer">${esc(landingUrl)}</a></p>
      </div>

      ${reporterNote ? `
      <!-- Reporter Note -->
      <div style="margin-bottom:20px">
        <h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Reporter Note</h2>
        <p style="margin:0;font-size:14px;color:#475569">${esc(reporterNote)}</p>
      </div>
      ` : ""}

      ${evidenceUrl ? `
      <!-- Evidence -->
      <div style="margin-bottom:24px">
        <h2 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">${evidenceLabel}</h2>
        <p style="margin:0;font-size:14px"><a href="${esc(evidenceUrl)}" style="color:#3b82f6;text-decoration:underline" target="_blank" rel="noopener noreferrer">${esc(evidenceLinkText)}</a></p>
      </div>
      ` : ""}

      <!-- Footer Note -->
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:13px;color:#64748b">This report was submitted using AB Jail.</p>
        <p style="margin:8px 0 0 0;font-size:12px;color:#94a3b8">Case UUID: ${esc(sub.id)}</p>
        <p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8">Case short_id: ${esc(shortId)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  // Send email using Resend
  const fromEmail = "reports@abjail.org"; // under verified domain
  try {
    const attachments: Array<{ filename: string; content: string; type?: string }> = [];
    
    // Attach email HTML if available, otherwise attach raw text
    if (sub.email_body) {
      const base64 = Buffer.from(String(sub.email_body), "utf8").toString("base64");
      attachments.push({ filename: "original_email.html", content: base64, type: "text/html" });
    } else if (sub.raw_text) {
      const base64 = Buffer.from(String(sub.raw_text), "utf8").toString("base64");
      attachments.push({ filename: "original_text.txt", content: base64, type: "text/plain" });
    }

    await resend.emails.send({
      to: env.REPORT_EMAIL_TO as string,
      from: fromEmail,
      replyTo: env.REPORT_EMAIL_FROM as string,
      cc: ccEmail || undefined,
      subject,
      text: body,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch {
    // Save failed report for audit
    await supabase.from("reports").insert({
      case_id: sub.id,
      to_email: env.REPORT_EMAIL_TO,
      cc_email: ccEmail,
      subject,
      body,
      screenshot_url: evidenceUrl,
      landing_url: landingUrl,
      status: "failed",
    });
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  // Save report row and add case note
  await supabase.from("reports").insert({
    case_id: sub.id,
    to_email: env.REPORT_EMAIL_TO,
    cc_email: ccEmail,
    subject,
    body,
    screenshot_url: evidenceUrl,
    landing_url: landingUrl,
    status: "sent",
  });
  await supabase.from("comments").insert({ submission_id: sub.id, content: `Report filed with ActBlue on ${new Date().toISOString()}.`, kind: "landing_page" });

  return NextResponse.json({ ok: true });
}


