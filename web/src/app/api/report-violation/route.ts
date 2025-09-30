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
    .select("id, sender_name, sender_id, raw_text, email_subject, email_body, ai_summary, image_url, landing_url, landing_screenshot_url")
    .eq("id", caseId)
    .limit(1);
  if (err) return NextResponse.json({ error: "case_load_failed" }, { status: 500 });
  const sub = rows?.[0] as
    | { id: string; sender_name?: string | null; sender_id?: string | null; raw_text?: string | null; landing_url?: string | null; landing_screenshot_url?: string | null }
    | undefined;
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const landingUrlRaw = sub.landing_url || landingUrlFromUser;
  const landingUrl = landingUrlRaw ? (() => { try { const u = new URL(landingUrlRaw); return `${u.origin}${u.pathname}`; } catch { return landingUrlRaw; } })() : null;
  if (!landingUrl) return NextResponse.json({ error: "landing_url_required" }, { status: 400 });

  // Build subject/body
  const shortId = sub.id.split("-")[0];
  const subject = `Reporting Possible Violation - Case #${shortId}`;
  // Prefer the primary submission screenshot if available (email/SMS evidence)
  let screenshotUrl: string | null = (sub as unknown as { image_url?: string | null }).image_url || null;
  if (screenshotUrl && !screenshotUrl.startsWith("http")) {
    const parsed = parseSupabaseUrl(screenshotUrl);
    if (parsed) {
      try {
        const { data: signed } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
        screenshotUrl = signed?.signedUrl || screenshotUrl;
      } catch {}
    }
  }
  const campaign = sub.sender_name || sub.sender_id || "(unknown sender)";

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
  if (screenshotUrl) sections.push(`Screenshot\n---------\n${screenshotUrl}`);
  sections.push(`Meta\n----\nThis report was submitted using AB Jail.\nCase UUID: ${sub.id}\nCase short_id: ${shortId}`);
  const body = sections.join("\n\n");

  // Minimal HTML version for nicer readability (keep simple for ticket systems)
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
        return `<ul>${ovLines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
      }
      return `<p>${esc(ovLines[0] || "")}</p>`;
    }
    return (violationsList.length > 0)
      ? `<ul>${violationsList.map((v: { code: string; title: string; description?: string | null }) => `<li><strong>${esc(v.code)}</strong> ${esc(v.title)}${v.description ? `: ${esc(v.description)}` : ""}</li>`).join("")}</ul>`
      : `<p>(none detected)</p>`;
  })();
  const html = `<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.4;color:#0f172a">
  <div>
    <p style="margin:0 0 8px 0"><strong>Campaign/Org</strong></p>
    <p style="margin:0 0 16px 0">${esc(campaign)}</p>

    <p style="margin:0 0 8px 0"><strong>Violations</strong></p>
    <div style="margin:0 0 16px 0">${vioHtml}</div>

    <p style="margin:0 0 8px 0"><strong>Landing page</strong></p>
    <p style="margin:0 0 16px 0"><a href="${esc(landingUrl)}" target="_blank" rel="noopener noreferrer">${esc(landingUrl)}</a></p>

    ${reporterNote ? `<p style=\"margin:0 0 8px 0\"><strong>Reporter note</strong></p><p style=\"margin:0 0 16px 0\">${esc(reporterNote)}</p>` : ""}

    ${screenshotUrl ? `<p style=\"margin:0 0 8px 0\"><strong>Screenshot</strong></p><p style=\"margin:0 0 16px 0\"><a href=\"${esc(screenshotUrl)}\" target=\"_blank\" rel=\"noopener noreferrer\">Screenshot</a></p>` : ""}

    <p style="margin:16px 0 4px 0"><strong>Meta</strong></p>
    <p style="margin:0">This report was submitted using AB Jail.</p>
    <p style="margin:0">Case UUID: <code>${esc(sub.id)}</code></p>
    <p style="margin:0">Case short_id: <code>${esc(shortId)}</code></p>
  </div>
  </body></html>`;

  // Send email using Resend
  const fromEmail = "reports@abjail.org"; // under verified domain
  try {
    const attachments: Array<{ filename: string; content: string; type?: string }> = [];
    const fullText = (sub as unknown as { email_body?: string | null; raw_text?: string | null }).email_body
      || (sub as unknown as { email_body?: string | null; raw_text?: string | null }).raw_text
      || "";
    if (fullText) {
      const base64 = Buffer.from(String(fullText), "utf8").toString("base64");
      attachments.push({ filename: "original_email.txt", content: base64, type: "text/plain" });
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
      screenshot_url: screenshotUrl,
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
    screenshot_url: screenshotUrl,
    landing_url: landingUrl,
    status: "sent",
  });
  await supabase.from("comments").insert({ submission_id: sub.id, content: `Report filed with ActBlue on ${new Date().toISOString()}.`, kind: "landing_page" });

  return NextResponse.json({ ok: true });
}


