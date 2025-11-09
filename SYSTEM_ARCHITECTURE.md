# AB Jail System Architecture - Complete Flow Documentation

## Database Schema

### submissions table
```sql
id uuid PRIMARY KEY
created_at timestamptz
uploader_fingerprint text
image_url text NOT NULL -- can be: supabase://bucket/path, http URL, or placeholder like "email://no-image", "sms://no-image"
message_type text -- enum: 'sms', 'email', 'unknown'
raw_text text -- cleaned text used by AI
processing_status text -- enum: 'queued', 'ocr', 'classified', 'done', 'error'
ocr_method text
ocr_confidence numeric(3,2)
ocr_ms int
classifier_ms int
sender_id text -- detected sender email/phone
sender_name text -- extracted org/campaign name
links jsonb -- array of {url, domain}
redact_level text -- enum: 'default', 'strict'
ai_version text -- model used for classification
ai_confidence numeric(3,2)
ai_summary text
email_subject text
email_body text -- sanitized HTML for email submissions
public boolean DEFAULT true
landing_url text -- ActBlue landing page URL
landing_screenshot_url text -- supabase:// URL to landing page screenshot
landing_rendered_at timestamptz
landing_render_status text -- pending, success, failed
is_fundraising boolean
normalized_text text -- for deduplication
normalized_hash text -- for deduplication
simhash64 text -- for deduplication
forwarder_email text -- email of person who forwarded (NULL for screenshot/paste)
submission_token text UNIQUE -- secure token for one-time report submission
token_used_at timestamptz -- NULL if unused
preview_email_sent_at timestamptz -- NULL if not sent
preview_email_status text -- pending, sent, failed
```

### violations table
```sql
id uuid PRIMARY KEY
submission_id uuid REFERENCES submissions(id)
code text -- AB001, AB003, AB004, AB007, AB008
title text
description text -- rationale
evidence_spans jsonb -- array of {text, start, end}
severity int -- 1-5
confidence numeric(3,2) -- 0-1
```

### reports table
```sql
id uuid PRIMARY KEY
case_id uuid REFERENCES submissions(id)
to_email text
cc_email text
subject text
body text
screenshot_url text
landing_url text
status text -- sent, failed, responded
created_at timestamptz
```

### comments table
```sql
id uuid
submission_id uuid REFERENCES submissions(id)
content text
kind text -- 'user', 'landing_page'
created_at timestamptz
```

## Entry Points - Three Ways to Submit

### 1. EMAIL FORWARDING FLOW (NEW FEATURE)

**User Action:** Forward email to submit@abjail.org

**Mailgun Webhook** → POST /api/inbound-email

**Flow:**
```
1. /api/inbound-email/route.ts
   - Parses Mailgun webhook (form-urlencoded, multipart, or JSON)
   - Extracts: sender, subject, body-plain, body-html
   - Stores envelope sender as `envelopeSender` (forwarder's email)
   - Attempts to detect original sender from forwarded message body
   - Strips forwarded headers from text
   - Redacts honeytrap emails (from HONEYTRAP_EMAILS env var)
   - Cleans text via cleanTextForAI()
   - Sanitizes HTML via sanitizeEmailHtml()
   - Generates secure token: randomBytes(32).toString('base64url')
   - Calls ingestTextSubmission() with:
     * text: cleanedText
     * rawText: original text
     * senderId: detectedSender (original sender, not forwarder)
     * messageType: 'email'
     * imageUrlPlaceholder: 'email://no-image'
     * emailSubject: subject
     * emailBody: sanitizedHtml
     * forwarderEmail: envelopeSender (KEY: this is the forwarder)
     * submissionToken: secure token
   - If duplicate detected, returns 200 with duplicate: true
   - If fundraising detected, calls triggerPipelines(submissionId)
   - If landing URL detected, triggers screenshot-actblue
   - If non-fundraising detected AND forwarded email, triggers send-non-fundraising-notice
   - Returns 200 {ok: true, id: submissionId}

2. /server/ingest/save.ts: ingestTextSubmission()
   - Runs heuristic check (computeHeuristic) for is_fundraising
   - Checks for duplicate via findDuplicateCase() using simhash
   - If duplicate found, returns {ok: false, error: 'duplicate', id: existingId}
   - Extracts ActBlue landing URL from text
   - Builds dedupe fields (normalized_text, normalized_hash, simhash64)
   - Inserts into submissions table including forwarder_email and submission_token
   - Returns {ok: true, id, isFundraising, landingUrl}

3. /server/ingest/save.ts: triggerPipelines()
   - Fires parallel requests to:
     * POST /api/classify (AI classification)
     * POST /api/sender (sender extraction)
     * POST /api/redact-pii (personalization/PII redaction) — NEW
   - All are fire-and-forget but awaited for serverless
   - Redaction is isolated; failures never impact other pipelines

4. /api/classify/route.ts
   - Updates processing_status = 'classified'
   - Calls runClassification(submissionId)
   - Fetches submission + creates signed URLs for images
   - Builds OpenAI messages with text + image(s) + landing page context
   - Calls OpenAI GPT-4o-mini with vision
   - Parses violations from response
   - Deletes old violations if replaceExisting=true
   - Inserts new violations
   - Updates processing_status = 'done', ai_version, ai_confidence, ai_summary
   - **NEW: Triggers preview email**
   - Fire-and-forget POST to /api/send-case-preview with submissionId
   - Returns {ok: true, violations, ms}

5. /api/send-case-preview/route.ts (NEW)
   - Accepts {submissionId}
   - Fetches submission data: forwarder_email, submission_token, preview_email_sent_at, etc.
   - **SKIP if forwarder_email is NULL** (screenshot/paste submissions)
   - **SKIP if preview_email_sent_at is not NULL** (already sent, prevents duplicates)
   - Fetches violations for the submission
   - Gets campaign name from sender_name or sender_id
   - Creates signed URL for screenshot (24h expiry)
   - Builds HTML email with:
     * Header with case number
     * Campaign/Org name
     * Violations list (formatted HTML)
     * Landing page URL
     * Screenshot link
     * Two buttons:
       - "Submit to ActBlue" → /api/submit-report-via-email?token={submission_token}
       - "Open on AB Jail" → /cases/{id}
   - Sends via Resend from notifications@abjail.org
   - Updates preview_email_sent_at and preview_email_status = 'sent'
   - Returns {ok: true}

6. USER CLICKS "SUBMIT TO ACTBLUE" IN EMAIL
   GET /api/submit-report-via-email?token={token}
   
7. /api/submit-report-via-email/route.ts (NEW)
   - Extracts token from query params
   - Fetches submission by submission_token
   - Returns error page if not found
   - Checks if token_used_at is set (already used)
   - If used, returns "Already Submitted" info page
   - Checks if landing_url exists
   - If missing, returns error page
   - **Marks token as used immediately**: token_used_at = NOW()
   - Makes internal POST to /api/report-violation with:
     * caseId
     * landingUrl
   - If successful, returns success HTML page
   - If failed, returns error HTML page
   - All pages include link to case page

8. /api/report-violation/route.ts
   - Fetches submission data
   - Fetches violations
   - Creates signed URL for screenshot
   - Builds email body (plain text + HTML)
   - Sends email via Resend to REPORT_EMAIL_TO
   - Inserts into reports table with status='sent'
   - Inserts comment: "Report filed with ActBlue on {date}"
   - Returns {ok: true}
```

**Key Variables:**
- `envelopeSender`: Email of person who forwarded (stored as forwarder_email)
- `detectedSender`: Original sender extracted from forwarded message body (stored as sender_id)
- `submission_token`: Secure 256-bit token for one-time submission
- `forwarder_email`: NULL = screenshot/paste, non-NULL = email forward

**Filtering Logic:**
- Only submissions with forwarder_email != NULL receive preview email
- Screenshot uploads and paste submissions have forwarder_email = NULL
- Duplicate prevention via preview_email_sent_at check

---

### 2. SCREENSHOT UPLOAD FLOW

**User Action:** Upload image file via web UI at /

**Flow:**
```
1. Frontend form submission
   - User selects image file
   - Optional: adds sender info, message type
   - POST to /api/upload

2. /api/upload/route.ts
   - Receives multipart/form-data with image file
   - Generates UUID for filename
   - Uploads to Supabase Storage bucket (SUPABASE_BUCKET_INCOMING)
   - Creates submission record:
     * image_url: supabase://bucket/path
     * message_type: from form or 'unknown'
     * processing_status: 'queued'
     * sender_id: from form if provided
     * forwarderEmail: NULL (no email forwarding)
     * submissionToken: NULL (no token needed)
   - Triggers OCR via /api/ocr
   - Returns {ok: true, id: submissionId}

3. /api/ocr/route.ts
   - Fetches submission
   - Creates signed URL for image
   - Calls OCRSpace API or similar
   - Extracts text from image
   - Updates submission:
     * raw_text: extracted text
     * processing_status: 'ocr'
     * ocr_confidence, ocr_ms
   - Runs heuristic to detect is_fundraising
   - If fundraising, calls triggerPipelines()
   - Returns {ok: true}

4. (Same as email flow from step 3 onwards)
   - triggerPipelines() → classify + sender (NO redact-pii here)
   - Classification completes
   - PII redaction is NOT triggered for screenshot/PDF uploads (UI displays raw file)
   - /api/send-case-preview is called but SKIPS because forwarder_email is NULL
   - No email sent to user
```

**Key Difference:** forwarder_email = NULL, so no preview email sent

---

## API Routes Reference

### POST /api/inbound-email
**Purpose:** Mailgun webhook handler for forwarded emails
**Input:** Mailgun webhook payload (form-urlencoded, multipart, or JSON)
**Output:** {ok: true, id: submissionId} or {ok: true, duplicate: true, id: existingId}
**Side Effects:**
- Creates submission with forwarder_email and submission_token
- Triggers classify + sender pipelines
- Triggers screenshot-actblue if landing URL detected

### POST /api/classify
**Purpose:** AI-powered violation classification
**Input:** {submissionId: string, includeExistingComments?: boolean}
**Output:** {ok: true, violations: number, ms: number}
**Side Effects:**
- Updates violations table
- Updates processing_status = 'done'
- **Triggers /api/send-case-preview** (fire-and-forget)

### POST /api/sender
**Purpose:** Extract sender name using OpenAI vision
**Input:** {submissionId: string}
**Output:** {ok: true, sender_name: string, model: string}
**Side Effects:**
- Updates sender_name in submissions table

### POST /api/redact-pii
**Purpose:** Post-processing step that redacts submitter PII (personalized strings) from stored text fields
**Input:** {submissionId: string}
**Output:** {ok: true, redacted: boolean, fieldsUpdated?: string[], confidence?: number}
**How it works:**
- Loads `raw_text`, `email_subject`, and `email_body`
- Calls `detectPII()` (server/ai/redact-pii.ts) which returns:
  - `strings_to_redact: string[]` (e.g., "Ryan,", "Ryan Mioduski", "ryan@mioduski.us")
  - `confidence: number (0..1)`
- Skips if no strings or confidence < 0.5
- Redacts all occurrences, plus punctuation-stripped variants ("Ryan," → also "Ryan")
- Sorts by length descending to avoid partial matches
- Updates DB for: `raw_text`, `email_subject`, `email_body`
**Notes:** Runs in parallel with other pipelines; failures don't affect them

### POST /api/screenshot-actblue
**Purpose:** Capture screenshot of ActBlue landing page
**Input:** {caseId: string, url: string}
**Output:** {ok: true, screenshotUrl: string}
**Side Effects:**
- Launches Puppeteer/Chromium
- Captures full-page screenshot
- Uploads to Supabase Storage
- Updates landing_screenshot_url, landing_render_status
- Inserts landing_page comment
- Triggers re-classification with landing context

### POST /api/send-case-preview
**Purpose:** Send preview email to forwarder after classification
**Input:** {submissionId: string}
**Output:** {ok: true} or {ok: true, skipped: 'no_forwarder_email'|'already_sent'}
**Filtering:**
- SKIP if forwarder_email is NULL
- SKIP if preview_email_sent_at is not NULL
**Side Effects:**
- Sends HTML email via Resend
- Updates preview_email_sent_at, preview_email_status
**Email Contains:**
- Campaign/org name
- Violations list
- Landing page URL
- Screenshot link
- "Submit to ActBlue" button → /api/submit-report-via-email?token={token}
- "Open on AB Jail" button → /cases/{id}

### POST /api/send-non-fundraising-notice
**Purpose:** Send notice email to forwarder when they submit non-fundraising emails
**Input:** {submissionId: string}
**Output:** {ok: true} or {ok: true, skipped: 'no_forwarder_email'}
**Filtering:**
- SKIP if forwarder_email is NULL
**Side Effects:**
- Sends HTML email via Resend
**Email Contains:**
- Message that AB Jail currently only supports fundraising emails
- Campaign/org name (if detected)
- Link to AB Jail website
- No action buttons (submission not processed)

### GET /api/submit-report-via-email?token={token}
**Purpose:** Handle one-click report submission from email
**Input:** Query param: token (submission_token)
**Output:** HTML page (success, error, or info)
**Validation:**
- Token must exist
- token_used_at must be NULL (not already used)
- landing_url must exist
**Side Effects:**
- Marks token_used_at = NOW() IMMEDIATELY (prevents double-submission)
- Calls /api/report-violation internally
- Returns styled HTML success/error page

### POST /api/report-violation
**Purpose:** Submit violation report to ActBlue
**Input:** {caseId: string, landingUrl?: string, ccEmail?: string, note?: string, violationsOverride?: string}
**Output:** {ok: true}
**Side Effects:**
- Fetches submission + violations
- Creates signed URLs for screenshots
- Builds email body (text + HTML)
- Sends email via Resend to REPORT_EMAIL_TO
- Inserts into reports table
- Inserts comment with timestamp

### POST /api/upload
**Purpose:** Handle screenshot upload from web UI
**Input:** multipart/form-data with image file
**Output:** {ok: true, id: submissionId}
**Side Effects:**
- Uploads image to Supabase Storage
- Creates submission (forwarder_email = NULL)
- Triggers OCR

### POST /api/ocr
**Purpose:** Extract text from uploaded image
**Input:** {submissionId: string}
**Output:** {ok: true, text: string}
**Side Effects:**
- Calls OCRSpace API
- Updates raw_text, ocr_confidence
- Triggers pipelines if fundraising

### GET /api/cases/{id}
**Purpose:** Fetch case details for display
**Input:** Path param: id (submission UUID)
**Output:** {item: submission, violations: violation[]}

### POST /api/cases/{id}/comments
**Purpose:** Add user comment to case
**Input:** {content: string}
**Output:** {ok: true}
**Side Effects:**
- Inserts comment with kind='user'

---

## Helper Functions

### /server/ingest/text-cleaner.ts: cleanTextForAI()
**Purpose:** Remove tracking links, invisible chars, excessive whitespace
**Input:** Raw text string
**Output:** Cleaned text string
**Operations:**
- Strips "Forwarded message" headers
- Removes tracking/unsubscribe links
- Removes zero-width characters
- Normalizes whitespace
- Decodes HTML entities

### /server/ingest/html-sanitizer.ts: sanitizeEmailHtml()
**Purpose:** Remove non-ActBlue links to protect honeytrap email
**Input:** HTML string
**Output:** Sanitized HTML string
**Operations:**
- Removes all links except ActBlue domains
- Preserves structure and styling
- Prevents honeytrap email exposure

### /server/ingest/dedupe.ts: findDuplicateCase()
**Purpose:** Check if submission already exists using simhash
**Input:** Text string
**Output:** {match: boolean, caseId?: string, distance?: number}
**Algorithm:**
- Normalizes text (lowercase, remove special chars)
- Computes simhash64
- Queries DB for similar hashes within distance threshold
- Returns match if found

### /server/ingest/save.ts: computeHeuristic()
**Purpose:** Fast check if text is fundraising-related
**Input:** Text string
**Output:** {isFundraising: boolean, score: number, hits: string[]}
**Keywords:** donate, donation, chip in, contribute, give now, actblue, match, pitch in, $1, $3, $5, etc.
**Logic:** isFundraising = (score >= 2) OR (score >= 1 AND contains dollar amount)

### /server/ingest/save.ts: extractActBlueUrl()
**Purpose:** Find ActBlue landing page URL in text
### /server/ai/redact-pii.ts: detectPII()
**Purpose:** Ask AI to return every personalized string that should be redacted
**Input:** raw_text (plus optional email_from)
**Output:** `{ strings_to_redact: string[], confidence: number }`
**Details:**
- Finds full names, first-name variants, initials (e.g., "R. Mioduski"), and personal emails
- Excludes org/candidate/PAC names and org emails
- Conservative confidence; threshold 0.5 applied by the API route
**Input:** Text string
**Output:** string | null
**Logic:**
- Extracts all URLs via regex
- Filters for actblue.com domains
- If multiple found, picks URL with most query params

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_BUCKET_INCOMING=incoming
SUPABASE_BUCKET_REDACTED=redacted
SUPABASE_BUCKET_SCREENSHOTS=screenshots

# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL_VISION=gpt-4o-mini

# OCR
OCRSPACE_API_KEY=xxx

# Email (Resend)
RESEND_API_KEY=re_xxx
REPORT_EMAIL_TO=reports@actblue.com  # or user's email for testing
REPORT_EMAIL_FROM=reports@abjail.org

# Site
NEXT_PUBLIC_SITE_URL=https://abjail.org

# Honeytrap emails (server-side only, comma-separated for multiple emails)
HONEYTRAP_EMAILS=email1@example.com,email2@example.com

# Deduplication
DEDUP_SIMHASH_DISTANCE=4  # max hamming distance for duplicate detection
```

---

## Processing Status States

```
queued → ocr → classified → done
                         ↘ error
```

**queued**: Initial state, waiting for processing
**ocr**: OCR in progress (screenshot uploads only)
**classified**: Classification in progress
**done**: All processing complete
**error**: Processing failed (OpenAI error, etc.)

---

## Security Considerations

### Submission Tokens
- 256-bit entropy (32 bytes base64url encoded)
- One-time use only (token_used_at timestamp)
- Validated before use
- Marked as used BEFORE calling report-violation to prevent race conditions

### Honeytrap Email Protection
- Honeytrap emails (configured via HONEYTRAP_EMAILS env var) are redacted server-side during ingestion
- Supports multiple comma-separated emails for misdirection
- Non-ActBlue links removed from email HTML
- Prevents exposing honeytrap to third parties
- No client-side redaction needed (data already clean from server)

### PII Redaction (Personalization Removal)
- Runs after ingest as an isolated step for email/SMS/text
- AI returns `strings_to_redact` to replace with asterisks
- Also redacts punctuation-stripped variants (e.g., "Ryan," → "Ryan")
- Applies to `raw_text`, `email_subject`, `email_body`
- Confidence threshold ≥ 0.5 to reduce false positives
- Not applied to screenshot/PDF uploads (raw files shown in UI)

### Signed URLs
- Supabase Storage URLs are signed with expiry (1-24 hours)
- Prevents unauthorized access to screenshots
- Regenerated on each request

---

## Email Sending (Resend)

### From Addresses
- **notifications@abjail.org**: Preview emails to users
- **reports@abjail.org**: Reports to ActBlue (via REPORT_EMAIL_FROM)

### Email Types
1. **Case Preview** (to forwarder_email)
   - Subject: "Your AB Jail case is ready - Case #{shortId}"
   - Contains: campaign, violations, landing URL, screenshot, action buttons
   - Sent after classification completes

2. **Non-Fundraising Notice** (to forwarder_email)
   - Subject: "Thanks for your submission - Case #{shortId}"
   - Contains: message that only fundraising emails are currently supported, campaign name, link to site
   - Sent immediately after non-fundraising email detected

3. **Violation Report** (to REPORT_EMAIL_TO)
   - Subject: "Reporting Possible Violation - Case #{shortId}"
   - Contains: campaign, violations, landing URL, screenshot, reporter note
   - Sent when user submits report (via UI or email button)

---

## Duplicate Detection

### Mechanism
- Uses simhash algorithm (64-bit fingerprint)
- Normalizes text: lowercase, remove special chars, collapse whitespace
- Computes fingerprint of word shingles
- Checks Hamming distance against existing submissions
- Default threshold: 4 bits difference

### Deduplication Fields
```sql
normalized_text text     -- cleaned text for comparison
normalized_hash text     -- SHA-256 of normalized_text
simhash64 text          -- 64-bit simhash as string (for PostgreSQL int8 safety)
```

### Duplicate Handling
- If duplicate found during ingest, returns existing case ID
- Does NOT create new submission
- /api/inbound-email returns {ok: true, duplicate: true, id: existingId}
- User receives link to existing case instead of new one

---

## Classification System

### Violation Codes
- **AB001**: Misrepresentation/Impersonation
- **AB003**: Missing Full Entity Name
- **AB004**: Entity Clarity (Org vs Candidate)
- **AB007**: False/Unsubstantiated Claims
- **AB008**: Unverified Matching Program

### OpenAI Integration
- Model: gpt-4o-mini (vision capable)
- Input: raw_text + screenshot image + landing page screenshot + comments
- Output: JSON with violations array, summary, overall_confidence
- Each violation: code, title, rationale, evidence_span_indices, severity (1-5), confidence (0-1)

### Re-classification
- Can be triggered manually from UI
- Can be triggered after landing page screenshot
- includeExistingComments=true includes reviewer notes and landing page context
- replaceExisting=true deletes old violations before inserting new ones

---

## Landing Page Screenshot Flow

```
1. User forwards email → landing URL detected
2. /api/inbound-email extracts ActBlue URL
3. After classification, /api/screenshot-actblue triggered
4. Puppeteer launches headless Chrome
5. Navigates to landing URL (15s timeout)
6. Waits for network idle and form load
7. Captures full-page screenshot
8. Uploads to Supabase Storage
9. Updates landing_screenshot_url
10. Inserts landing_page comment with URL + screenshot
11. Triggers re-classification with includeExistingComments=true
12. AI sees landing page context and adjusts violations
```

---

## Comment System

### Comment Kinds
- **user**: Human-added comments (shown in UI)
- **landing_page**: System-generated context about landing page (hidden in UI, used by AI)

### Landing Page Comments
Format:
```
landing_page: https://secure.actblue.com/donate/...
screenshot: supabase://screenshots/xxx.png
```

These are NOT displayed in the UI but are included when re-classifying with `includeExistingComments=true`.

---

## Testing Scenarios

### Email Forwarding
1. Forward email to submit@abjail.org
2. Check submission created with forwarder_email populated
3. Wait for classification (~30s-2min)
4. Check forwarder inbox for preview email
5. Click "Submit to ActBlue" button
6. Verify report sent to REPORT_EMAIL_TO
7. Verify token marked as used
8. Try clicking button again → should show "already submitted"

### Screenshot Upload
1. Upload image via web UI
2. Check submission created with forwarder_email = NULL
3. Wait for OCR + classification
4. Verify NO email sent (forwarder_email is NULL)
5. Case visible at /cases/{id}

### Duplicate Detection
1. Forward same email twice
2. Second submission should return duplicate=true
3. Should reference original case ID
4. No new submission created

### Re-classification
1. Trigger re-classification from UI
2. Verify violations updated
3. Verify NO duplicate email sent (preview_email_sent_at already set)

---

## Error Handling

### Email Send Failures
- Logged to console
- preview_email_status = 'failed'
- Does NOT retry automatically
- Does NOT block case creation

### Classification Failures
- processing_status = 'error'
- Prevents stuck "classified" state
- Can be retried manually

### Screenshot Failures
- landing_render_status = 'failed'
- Does NOT block classification
- Can be retried manually

### Token Validation Failures
- Returns user-friendly HTML error page
- Links back to case page
- Token remains unused (can't complete submission)

---

## Data Flow Summary

```
EMAIL FORWARD:
Mailgun → /api/inbound-email → ingestTextSubmission() → DB insert with forwarder_email + token
  ↓
triggerPipelines() → /api/classify + /api/sender + /api/redact-pii (parallel)
  ↓
/api/classify completes → /api/send-case-preview (fire-and-forget)
  ↓
/api/send-case-preview checks forwarder_email != NULL → sends email
  ↓
User clicks "Submit" → /api/submit-report-via-email?token=xxx
  ↓
/api/submit-report-via-email validates token → marks used → calls /api/report-violation
  ↓
/api/report-violation sends email to ActBlue → inserts report → adds comment


SCREENSHOT UPLOAD:
/api/upload → DB insert with forwarder_email = NULL → /api/ocr
  ↓
/api/ocr extracts text → triggerPipelines()
  ↓
/api/classify completes → /api/send-case-preview
  ↓
/api/send-case-preview checks forwarder_email = NULL → SKIPS (no email sent)


TEXT PASTE:
Text submission → ingestTextSubmission() with forwarder_email = NULL
  ↓
triggerPipelines() → /api/classify + /api/redact-pii
  ↓
/api/classify completes → /api/send-case-preview
  ↓
/api/send-case-preview checks forwarder_email = NULL → SKIPS (no email sent)


NON-FUNDRAISING EMAIL FORWARD:
Mailgun → /api/inbound-email → ingestTextSubmission() → DB insert with forwarder_email
  ↓
Heuristic detects non-fundraising → /api/send-non-fundraising-notice (fire-and-forget)
  ↓
/api/send-non-fundraising-notice checks forwarder_email != NULL → sends notice email
  ↓
User receives email explaining only fundraising emails are supported
```

---

## Key Decision Points

### When to send preview email?
- ONLY if forwarder_email != NULL (email forwards only)
- ONLY if preview_email_sent_at = NULL (not already sent)
- After classification completes successfully

### When to skip preview email?
- forwarder_email = NULL (screenshot/paste submissions)
- preview_email_sent_at != NULL (already sent, prevents duplicates on re-classification)
- Classification failed (processing_status = 'error')

### When to trigger classification?
- After OCR completes (screenshot uploads)
- After text ingestion (email forwards, text paste)
- After landing page screenshot captured
- Manual trigger from UI

### When to trigger sender extraction?
- In parallel with classification
- Only for fundraising submissions

### When to capture landing page screenshot?
- If landing URL detected in email/text
- After initial classification
- NOT for screenshot uploads (usually already have image)

---

## File Locations

### API Routes
- /web/src/app/api/inbound-email/route.ts
- /web/src/app/api/classify/route.ts
- /web/src/app/api/sender/route.ts
- /web/src/app/api/screenshot-actblue/route.ts
- /web/src/app/api/send-case-preview/route.ts (NEW)
- /web/src/app/api/send-non-fundraising-notice/route.ts (NEW)
- /web/src/app/api/submit-report-via-email/route.ts (NEW)
- /web/src/app/api/report-violation/route.ts
- /web/src/app/api/upload/route.ts
- /web/src/app/api/ocr/route.ts
- /web/src/app/api/cases/route.ts
- /web/src/app/api/cases/[id]/route.ts
- /web/src/app/api/cases/[id]/comments/route.ts

### Server Logic
- /web/src/server/ingest/save.ts
- /web/src/server/ingest/text-cleaner.ts
- /web/src/server/ingest/html-sanitizer.ts
- /web/src/server/ingest/dedupe.ts
- /web/src/server/ai/classify.ts
- /web/src/server/ai/sender.ts
- /web/src/server/ai/redact-pii.ts (NEW)
- /web/src/server/email/draft.ts

### Database
- /web/src/server/db/schema.ts
- /web/src/server/db/client.ts
- /web/sql/*.sql (migrations)

### Frontend
- /web/src/app/cases/[id]/page.tsx
- /web/src/app/cases/[id]/client.tsx
- /web/src/app/page.tsx

---

## Debugging Tips

### Email not received?
- Check submission has forwarder_email != NULL
- Check preview_email_sent_at timestamp
- Check preview_email_status = 'sent'
- Check Resend dashboard for delivery status
- Check spam folder
- Verify RESEND_API_KEY is set
- Verify notifications@abjail.org is verified sender

### Token invalid?
- Check submission_token exists in DB
- Check token_used_at = NULL (not already used)
- Check token matches exactly (case-sensitive, base64url encoding)
- Check landing_url exists on submission

### Classification stuck?
- Check processing_status
- If 'classified', check for OpenAI errors in logs
- If 'error', classification failed - can retry
- Check OPENAI_API_KEY is set
- Check image URLs are accessible (signed URLs not expired)

### Duplicate not detected?
- Check DEDUP_SIMHASH_DISTANCE threshold
- Check normalized_text and simhash64 fields populated
- Simhash is fuzzy - very similar but not identical text may not match
- Check logs for dedupe_failed warnings

### Screenshot failed?
- Check Chrome/Chromium executable available
- Check landing URL is valid ActBlue domain
- Check 15s timeout not exceeded
- Check Supabase Storage bucket exists
- Check network allows outbound HTTPS to actblue.com

---

END OF DOCUMENTATION

