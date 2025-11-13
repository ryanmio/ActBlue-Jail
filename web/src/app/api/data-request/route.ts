import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

import { z } from "zod";
import { Resend } from "resend";

import { env } from "@/lib/env";

const fieldValues = [
  "reviewed_messages",
  "detected_violations",
  "landing_page_images",
  "email_html",
  "non_fundraising",
  "comments",
  "verdicts",
] as const;

type FieldValue = (typeof fieldValues)[number];

const fieldLabels: Record<FieldValue, string> = {
  reviewed_messages: "Reviewed Messages",
  detected_violations: "Detected Violations",
  landing_page_images: "Include Landing Page Images",
  email_html: "Include Email HTML",
  non_fundraising: "Include Non-Fundraising",
  comments: "Include Comments",
  verdicts: "Include Verdicts",
};

const RequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required"),
  description: z.string().trim().min(1, "Description is required").max(2000),
  dateRange: z.string().trim().min(1, "Date range is required").max(200),
  fields: z.array(z.enum(fieldValues)).min(1, "Select at least one dataset").max(fieldValues.length),
});

type RequestPayload = z.infer<typeof RequestSchema>;

function buildEmailContent(payload: RequestPayload) {
  const fieldList = payload.fields
    .map((key) => `- ${fieldLabels[key] ?? key}`)
    .join("\n");

  const escapeHtml = (input: string) =>
    String(input)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const text = `New Research Data Request

Name: ${payload.name}
Email: ${payload.email}
Date Range: ${payload.dateRange}

Requested Datasets:
${fieldList}

Intended Use:
${payload.description}
`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.5;color:#0f172a;margin:0;padding:0;background-color:#f8fafc">
    <div style="max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">Research Data Request</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">Submitted via stats page</p>
      </div>
      <div style="background:white;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#0f172a;">Requester</h2>
        <p style="margin:0 0 4px 0;font-size:14px;"><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
        <p style="margin:0 0 16px 0;font-size:14px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(payload.email)}" style="color:#1e40af;text-decoration:underline;">${escapeHtml(payload.email)}</a></p>

        <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#0f172a;">Requested Date Range</h2>
        <p style="margin:0 0 16px 0;font-size:14px;color:#0f172a;">${escapeHtml(payload.dateRange)}</p>

        <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#0f172a;">Requested Datasets</h2>
        <ul style="margin:0 0 16px 0;padding-left:20px;font-size:14px;color:#0f172a;">
          ${payload.fields.map((key) => `<li>${escapeHtml(fieldLabels[key] ?? key)}</li>`).join("")}
        </ul>

        <h2 style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#0f172a;">Usage Description</h2>
        <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;">${escapeHtml(payload.description)}</p>
      </div>
    </div>
  </body>
</html>`;

  return { text, html };
}

export async function POST(req: NextRequest) {
  if (!env.RESEND_API_KEY) {
    return NextResponse.json({ error: "resend_key_missing" }, { status: 400 });
  }
  if (!env.DATA_REQUEST_EMAIL) {
    return NextResponse.json({ error: "data_request_email_missing" }, { status: 500 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parseResult = RequestSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "validation_failed",
        details: parseResult.error.flatten(),
      },
      { status: 400 },
    );
  }

  const data = parseResult.data;
  const resend = new Resend(env.RESEND_API_KEY);
  const { text, html } = buildEmailContent(data);

  try {
    await resend.emails.send({
      from: "AB Jail <notifications@abjail.org>",
      to: env.DATA_REQUEST_EMAIL,
      replyTo: data.email,
      subject: `Research Data Request from ${data.name}`,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("data-request:send_failed", err);
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}

