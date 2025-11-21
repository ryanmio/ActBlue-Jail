# Automated Data Collection System

**Last Updated**: November 21, 2025

This document explains how AB Jail automatically collects emails and SMS messages through external webhooks, how Next.js API routes work, and how data flows through the processing pipeline.

---

## Table of Contents
1. [What Triggers the API Routes?](#what-triggers-the-api-routes)
2. [How Next.js API Routes Work](#how-nextjs-api-routes-work)
3. [Mailgun Setup (Email Collection)](#mailgun-setup-email-collection)
4. [Twilio Setup (SMS Collection)](#twilio-setup-sms-collection)
5. [Pipeline Flow: From Webhook to Classification](#pipeline-flow-from-webhook-to-classification)
6. [Serverless Considerations](#serverless-considerations)

---

## What Triggers the API Routes?

AB Jail has **two main automated entry points** that trigger API routes:

### 1. Email Collection (Mailgun Webhook)
- **Trigger**: Email arrives at `submit@abjail.org` from two sources:
  - Manual: Someone manually forwards an email to `submit@abjail.org`
  - Automated: Honeytrap email bot addresses (subscribed to PAC mailing lists) receive emails and auto-forward to `submit@abjail.org`
- **Handler**: Mailgun receives the email and POSTs to `POST /api/inbound-email`
- **Frequency**: Real-time, whenever an email arrives (thousands per day from honeytrap bots)

### 2. SMS Collection (Twilio Webhook) - Bot Only
- **Trigger**: PACs text directly to AB Jail's Twilio phone number(s)
  - **Note**: Currently SMS collection is **always bot-collected** (no manual forwarding option exists yet)
  - Bots subscribe to PAC SMS lists using the Twilio phone number
  - No user forwarding available at this time (planned feature)
- **Handler**: Twilio receives the SMS and POSTs to `POST /api/inbound-sms`
- **Frequency**: Real-time, whenever an SMS arrives (~30% of scam volume and growing)

**Key Insight**: These are **push-based webhooks**, not polling. External services (Mailgun/Twilio) push data to your app when events occur. Your app doesn't need to constantly check for new messages.

---

## Honeytrap Email System

### How It Works
AB Jail maintains a fleet of **honeytrap email addresses** that are automatically subscribed to suspected PAC mailing lists:

1. **Honeytrap Bots**: Multiple email addresses (e.g., `bot1@abjail.org`, `bot2@abjail.org`) owned by AB Jail
2. **PAC Subscriptions**: These bots subscribe to scam PAC donation pages and receive emails
3. **Auto-Forwarding**: Each honeytrap email has a Mailgun forwarding rule that automatically forwards all received emails to `submit@abjail.org`
4. **Deduplication**: If multiple honeytrap bots receive the same email, the system dedupes it (only processes once)

### Why Multiple Honeytrap Emails?
PACs use email engagement metrics to prioritize sending:
- They track open rates (which addresses are "active")
- They track donation rates (which addresses donate)
- Addresses that stop receiving emails are likely inactive or unsubscribed

By rotating honeytrap addresses and keeping them "fresh", AB Jail continues receiving emails from PACs that would otherwise exclude inactive subscribers.

### Honeytrap Email Protection
The honeytrap email addresses are **sensitive information** and must be protected:

1. **Server-side redaction**: In `/api/inbound-email`, honeytrap emails are redacted before storage:
   ```typescript
   const honeytrapEmails = env.HONEYTRAP_EMAILS.split(',').map(e => e.trim());
   const redactHoneytrap = (text: string) => {
     for (const email of honeytrapEmails) {
       text = text.replace(new RegExp(email, 'gi'), '*******@*******.com');
     }
     return text;
   };
   ```

2. **HTML sanitization**: Non-ActBlue links are removed from email HTML, preventing accidental exposure of honeytrap emails via reply-to or unsubscribe links

3. **Environment variable only**: Honeytrap emails are stored in `HONEYTRAP_EMAILS` environment variable (not in git)

4. **Original email detection**: When forwarded from honeytrap, the system extracts the **original sender** (the PAC's email) for violation detection, not the honeytrap address

### Code: Honeytrap Redaction
```typescript
// From /api/inbound-email/route.ts
const honeytrapEmails = env.HONEYTRAP_EMAILS 
  ? env.HONEYTRAP_EMAILS.split(',').map(e => e.trim()).filter(e => e.length > 0)
  : [];

const redactHoneytrap = (text: string) => {
  let result = text;
  for (const email of honeytrapEmails) {
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '*******@*******.com');
  }
  return result;
};

// Apply redaction to both plain text and HTML
rawText = redactHoneytrap(rawText);
sanitizedHtml = redactHoneytrap(sanitizedHtml);
```

---

## How Next.js API Routes Work

### App Router Structure
ActBlue Jail uses Next.js 13+ **App Router** (not the legacy Pages Router). API routes are defined as `route.ts` files within the `/app/api/` directory:

```
web/src/app/api/
├── inbound-email/
│   └── route.ts          → POST /api/inbound-email
├── inbound-sms/
│   └── route.ts          → POST /api/inbound-sms
├── classify/
│   └── route.ts          → POST /api/classify
├── sender/
│   └── route.ts          → POST /api/sender
├── redact-pii/
│   └── route.ts          → POST /api/redact-pii
└── screenshot-actblue/
    └── route.ts          → POST /api/screenshot-actblue
```

### Route Handler Format
Each `route.ts` exports HTTP method functions:

```typescript
// Example: /api/inbound-email/route.ts
export async function POST(req: NextRequest) {
  // Parse request body
  const data = await req.json();
  
  // Process data
  const result = await processData(data);
  
  // Return response
  return NextResponse.json({ ok: true, result });
}
```

### Serverless Deployment (Vercel)
When deployed on Vercel, each API route becomes an **independent serverless function**:
- **Cold Start**: First request may take 1-3 seconds to spin up
- **Warm Duration**: Functions stay warm for ~5 minutes after last request
- **Timeout**: 10 seconds on Hobby plan, 60 seconds on Pro
- **No Persistent State**: Each request is isolated (no shared memory between requests)

This is why the code uses patterns like:
- **Fire-and-forget fetch calls** for long-running tasks (screenshots)
- **Immediate `await` for pipelines** to ensure completion before function exits
- **Database for state persistence** (not in-memory variables)

---

## Mailgun Setup (Email Collection)

### Webhook Payload Format
Mailgun sends `application/x-www-form-urlencoded` or `multipart/form-data`:

```
sender=user@example.com
from=John Doe <user@example.com>
subject=FW: Check this out
body-plain=This is the plain text body...
body-html=<html><body>This is the HTML body...</body></html>
```

### Code Implementation
See `/web/src/app/api/inbound-email/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  // Parse Mailgun payload (handles form-encoded, multipart, or JSON)
  const contentType = req.headers.get("content-type") || "";
  let sender, subject, bodyPlain, bodyHtml;
  
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    sender = params.get("sender") || params.get("from") || "";
    subject = params.get("subject") || "";
    bodyPlain = params.get("body-plain") || "";
    bodyHtml = params.get("body-html") || "";
  }
  // ... multipart and JSON handling omitted for brevity
  
  // Detect if forwarded email
  const isForwarded = detectForwardedEmail(subject, bodyPlain, bodyHtml);
  
  // Extract original sender from forwarded message
  const originalFromLine = extractOriginalFromLine(bodyPlain);
  
  // Clean and sanitize
  const cleanedText = cleanTextForAI(bodyPlain);
  const sanitizedHtml = sanitizeEmailHtml(bodyHtml);
  
  // Generate secure token for one-click submission
  const submissionToken = randomBytes(32).toString("base64url");
  
  // Save to database
  const result = await ingestTextSubmission({
    text: cleanedText,
    messageType: "email",
    emailSubject: subject,
    emailBody: sanitizedHtml,
    forwarderEmail: isForwarded ? sender : null,
    submissionToken: submissionToken,
  });
  
  // Trigger processing pipeline
  if (result.isFundraising && result.id) {
    await triggerPipelines(result.id);
  }
  
  return NextResponse.json({ ok: true, id: result.id });
}
```

**Key Steps**:
1. Parse webhook payload (flexible content-type handling)
2. Detect if forwarded email (vs. direct submission)
3. Extract original sender from forwarded message headers
4. Clean text (remove tracking links, normalize whitespace)
5. Sanitize HTML (remove non-ActBlue links to protect honeytrap emails)
6. Generate secure submission token
7. Save to database via `ingestTextSubmission()`
8. Trigger classification pipeline if fundraising-related

---

## Twilio Setup (SMS Collection - Bot Only)

### Phone Number Configuration
1. **Purchase a phone number** in Twilio console (or multiple numbers for engagement diversity)
2. **Configure Messaging webhook**:
   ```
   When a message comes in: Webhook
   URL: https://abjail.org/api/inbound-sms
   HTTP Method: POST
   ```

### Bot Subscription Strategy
Unlike emails where multiple honeytrap addresses keep subscriptions fresh, SMS works differently:

- **Direct subscription**: The Twilio phone number subscribes to PAC SMS lists
- **No forwarding**: SMS cannot be auto-forwarded like emails, so bots text **directly to your Twilio number**
- **Fresh numbers**: When PACs update their subscriber lists or engagement metrics, you may need to rotate phone numbers (similar to email honeytrap rotation)
- **Volume**: Text messages represent ~30% of scam communications and are growing

### Planned: SMS Forwarding (Not Yet Implemented)
From notes: "Build onboarding route for SMS bot subscriptions" - this would allow users to:
- Text their received scam SMS to AB Jail's number
- Have it auto-processed like email forwarding

This is a **priority gap** because manual SMS submission is currently not possible.

### Webhook Payload Format
Twilio sends `application/x-www-form-urlencoded`:

```
From=+15551234567
To=+15559876543
Body=Donate now to save democracy! Match 600%
NumMedia=1
MediaUrl0=https://api.twilio.com/2010-04-01/Accounts/.../Media/...
MediaContentType0=image/jpeg
```

### Code Implementation
See `/web/src/app/api/inbound-sms/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  // Parse Twilio payload
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const bodyText = params.get("Body") || "";
  const fromNumber = params.get("From") || "";
  
  // Parse MMS media attachments
  const mediaUrls = [];
  const numMedia = parseInt(params.get("NumMedia") || "0", 10);
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params.get(`MediaUrl${i}`);
    if (mediaUrl) {
      mediaUrls.push({ url: mediaUrl });
    }
  }
  
  // Clean text (repair mojibake, normalize punctuation)
  const cleanedText = cleanTextForAI(repairMojibake(bodyText));
  
  // Save to database
  const result = await ingestTextSubmission({
    text: cleanedText,
    rawText: bodyText,
    senderId: fromNumber,
    messageType: "sms",
    imageUrlPlaceholder: "sms://no-image",
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  });
  
  // Trigger processing pipeline
  if (result.isFundraising && result.id) {
    await triggerPipelines(result.id);
  }
  
  // Twilio expects TwiML response
  return new NextResponse(`<Response></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}
```

**Key Steps**:
1. Parse Twilio form-encoded payload
2. Extract SMS body and sender phone number
3. Parse MMS media attachments (if any)
4. Repair mojibake (common in SMS encoding issues)
5. Clean text for AI processing
6. Save to database
7. Trigger pipeline if fundraising
8. Return TwiML response (Twilio requirement)

**Important**: Twilio expects an XML response with `Content-Type: text/xml`, even if empty (`<Response></Response>`). This acknowledges receipt.

---

## Pipeline Flow: From Webhook to Classification

### Overview Diagram
```
MAILGUN/TWILIO
     ↓
     ↓ POST webhook
     ↓
/api/inbound-email OR /api/inbound-sms
     ↓
     ↓ ingestTextSubmission()
     ↓
DATABASE (submissions table)
     ↓
     ↓ triggerPipelines()
     ↓
     ├→ /api/classify (AI violation detection)
     ├→ /api/sender (extract sender name)
     └→ /api/redact-pii (remove personal info)
     ↓
     ↓ after classify completes
     ↓
/api/send-case-preview (email to forwarder)
     ↓
USER RECEIVES EMAIL
     ↓
     ↓ clicks "Submit to ActBlue"
     ↓
/api/submit-report-via-email
     ↓
/api/report-violation (sends to ActBlue)
```

### Step-by-Step Handoffs

#### 1. Initial Ingestion
**File**: `/web/src/server/ingest/save.ts`

```typescript
export async function ingestTextSubmission(params: {
  text: string;
  rawText: string;
  senderId?: string | null;
  messageType: "email" | "sms";
  // ... other params
}) {
  // Run heuristic to detect if fundraising-related
  const heuristic = computeHeuristic(params.text);
  
  // Check for duplicates using simhash
  const duplicate = await findDuplicateCase(params.text);
  if (duplicate.match) {
    return { ok: false, error: "duplicate", id: duplicate.caseId };
  }
  
  // Extract ActBlue landing page URL
  const landingUrl = extractActBlueUrl(params.text);
  
  // Insert into submissions table
  const submission = await db.insert(submissionsTable).values({
    raw_text: params.text,
    sender_id: params.senderId,
    message_type: params.messageType,
    is_fundraising: heuristic.isFundraising,
    landing_url: landingUrl,
    processing_status: "queued",
    // ... other fields
  }).returning();
  
  return {
    ok: true,
    id: submission.id,
    isFundraising: heuristic.isFundraising,
    landingUrl,
  };
}
```

**Key Logic**:
- **Heuristic check**: Fast keyword matching (donate, actblue, $5, etc.) to filter fundraising messages
- **Duplicate detection**: Simhash algorithm compares text similarity
- **URL extraction**: Finds ActBlue landing page URLs for screenshot capture
- **Database insert**: Creates submission record with `processing_status = 'queued'`

#### 2. Pipeline Trigger
**File**: `/web/src/server/ingest/save.ts`

```typescript
export async function triggerPipelines(submissionId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  
  // Fire THREE parallel requests
  await Promise.all([
    // 1. AI classification (detect violations)
    fetch(`${base}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }),
    
    // 2. Sender extraction (get campaign name)
    fetch(`${base}/api/sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }),
    
    // 3. PII redaction (remove personal info)
    fetch(`${base}/api/redact-pii`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }),
  ]);
}
```

**Why `await` here?**
- In serverless, functions terminate immediately after the handler returns
- Without `await`, these fetch calls would be killed mid-flight
- We wait for all three to complete before returning from webhook handler

**Why parallel?**
- These three operations are independent (don't need each other's results)
- Running in parallel reduces total processing time from ~40s to ~15s

#### 3. Classification
**File**: `/web/src/app/api/classify/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { submissionId } = await req.json();
  
  // Update status
  await db.update(submissionsTable)
    .set({ processing_status: "classified" })
    .where(eq(submissionsTable.id, submissionId));
  
  // Fetch submission data
  const submission = await db.query.submissions.findFirst({
    where: eq(submissionsTable.id, submissionId),
  });
  
  // Call OpenAI with vision
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an expert at detecting ActBlue policy violations..."
      },
      {
        role: "user",
        content: [
          { type: "text", text: submission.raw_text },
          { type: "image_url", image_url: { url: signedImageUrl } },
        ],
      },
    ],
  });
  
  // Parse violations from response
  const violations = parseViolations(response);
  
  // Save violations to database
  await db.insert(violationsTable).values(
    violations.map(v => ({
      submission_id: submissionId,
      code: v.code,
      title: v.title,
      description: v.description,
      // ...
    }))
  );
  
  // Update status
  await db.update(submissionsTable)
    .set({ processing_status: "done" })
    .where(eq(submissionsTable.id, submissionId));
  
  // HANDOFF: Trigger preview email
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  void fetch(`${base}/api/send-case-preview`, {
    method: "POST",
    body: JSON.stringify({ submissionId }),
  });
  
  return NextResponse.json({ ok: true, violations: violations.length });
}
```

**Key Handoff**: After classification completes, it fires `/api/send-case-preview` to email the forwarder. This is **fire-and-forget** (using `void`) because we don't want to block the classification response.

#### 4. Preview Email
**File**: `/web/src/app/api/send-case-preview/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { submissionId } = await req.json();
  
  // Fetch submission
  const submission = await db.query.submissions.findFirst({
    where: eq(submissionsTable.id, submissionId),
  });
  
  // SKIP if no forwarder email (screenshot uploads)
  if (!submission.forwarder_email) {
    return NextResponse.json({ ok: true, skipped: "no_forwarder_email" });
  }
  
  // SKIP if already sent (prevents duplicates on re-classification)
  if (submission.preview_email_sent_at) {
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }
  
  // Fetch violations
  const violations = await db.query.violations.findMany({
    where: eq(violationsTable.submission_id, submissionId),
  });
  
  // Build email HTML with violations and action buttons
  const emailHtml = buildPreviewEmail({
    caseId: submission.id,
    campaignName: submission.sender_name,
    violations,
    submissionToken: submission.submission_token,
  });
  
  // Send via Resend
  await resend.emails.send({
    from: "notifications@abjail.org",
    to: submission.forwarder_email,
    subject: `Your AB Jail case is ready - Case #${shortId}`,
    html: emailHtml,
  });
  
  // Mark as sent
  await db.update(submissionsTable)
    .set({
      preview_email_sent_at: new Date(),
      preview_email_status: "sent",
    })
    .where(eq(submissionsTable.id, submissionId));
  
  return NextResponse.json({ ok: true });
}
```

**Key Logic**:
- **Filtering**: Only sends to email forwards (not screenshot uploads)
- **Deduplication**: Checks `preview_email_sent_at` to prevent duplicate emails
- **One-time token**: Includes `submission_token` for secure one-click submission

#### 5. User Clicks "Submit to ActBlue"
**File**: `/web/src/app/api/submit-report-via-email/route.ts`

When user clicks the button in their email, they visit:
```
GET /api/submit-report-via-email?token=abc123xyz
```

```typescript
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  
  // Fetch submission by token
  const submission = await db.query.submissions.findFirst({
    where: eq(submissionsTable.submission_token, token),
  });
  
  if (!submission) {
    return new NextResponse(errorPageHtml("Invalid token"), {
      headers: { "Content-Type": "text/html" },
    });
  }
  
  // Check if already used
  if (submission.token_used_at) {
    return new NextResponse(alreadySubmittedPageHtml(), {
      headers: { "Content-Type": "text/html" },
    });
  }
  
  // MARK AS USED IMMEDIATELY (prevents double-submission)
  await db.update(submissionsTable)
    .set({ token_used_at: new Date() })
    .where(eq(submissionsTable.id, submission.id));
  
  // HANDOFF: Submit report to ActBlue
  const response = await fetch(`${base}/api/report-violation`, {
    method: "POST",
    body: JSON.stringify({
      caseId: submission.id,
      landingUrl: submission.landing_url,
    }),
  });
  
  if (response.ok) {
    return new NextResponse(successPageHtml(), {
      headers: { "Content-Type": "text/html" },
    });
  } else {
    return new NextResponse(errorPageHtml("Submission failed"), {
      headers: { "Content-Type": "text/html" },
    });
  }
}
```

**Key Security**: Token is marked as used **before** calling `/api/report-violation` to prevent race conditions (multiple simultaneous clicks).

#### 6. Report to ActBlue
**File**: `/web/src/app/api/report-violation/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const { caseId, landingUrl } = await req.json();
  
  // Fetch submission + violations
  const submission = await db.query.submissions.findFirst({
    where: eq(submissionsTable.id, caseId),
  });
  const violations = await db.query.violations.findMany({
    where: eq(violationsTable.submission_id, caseId),
  });
  
  // Build email body
  const emailHtml = buildReportEmail({
    caseId,
    campaignName: submission.sender_name,
    violations,
    landingUrl,
  });
  
  // Send to ActBlue
  await resend.emails.send({
    from: "reports@abjail.org",
    to: process.env.REPORT_EMAIL_TO, // ActBlue's email
    subject: `Reporting Possible Violation - Case #${shortId}`,
    html: emailHtml,
  });
  
  // Log in reports table
  await db.insert(reportsTable).values({
    case_id: caseId,
    to_email: process.env.REPORT_EMAIL_TO,
    status: "sent",
  });
  
  // Add comment to case
  await db.insert(commentsTable).values({
    submission_id: caseId,
    content: `Report filed with ActBlue on ${new Date().toISOString()}`,
    kind: "system",
  });
  
  return NextResponse.json({ ok: true });
}
```

**End Result**: ActBlue receives an email with violation details, screenshots, and landing page URL.


