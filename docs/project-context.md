AB Jail is a Next.js + Supabase app that ingests political fundraising violations from multiple sources, classifies potential ActBlue policy violations, and renders a public case database. Data collection happens via three parallel channels: (1) **Email webhooks** from Mailgun (`POST /api/inbound-email`) collecting forwarded emails from both manual users and honeytrap bots subscribed to PAC lists; (2) **SMS webhooks** from Twilio (`POST /api/inbound-sms`) collecting text messages sent directly to AB Jail's bot numbers; and (3) **Screenshot uploads** from `web/src/app/page.tsx` where users manually upload images via `POST /api/upload`. The web app lives in `web/` (App Router, TypeScript, Tailwind) and uses Supabase for authentication, storage, and PostgreSQL backend. For screenshots, OCR via OCR.space extracts text. For emails/SMS, raw text is used directly. All paths converge on the same classification and deduplication pipeline.

**Data ingestion** happens via `ingestTextSubmission()` in `web/src/server/ingest/save.ts`, which deduplicates (simhash algorithm), detects fundraising (keyword heuristic), extracts ActBlue landing URLs, and stores submissions to Postgres. **Parallel processing** is triggered via `triggerPipelines()` which fires three concurrent requests: `POST /api/classify` (AI violation detection), `POST /api/sender` (campaign name extraction), and `POST /api/redact-pii` (PII removal for forwarded emails). **Classification** runs in `web/src/app/api/classify/route.ts`, reading raw text + optional screenshot, submitting to OpenAI GPT-4o-mini with vision to detect violations (AB001–AB008), parsing JSON robustly, saving violations to the `violations` table, and updating submission status. **Email workflows** include `POST /api/send-case-preview` (notifies forwarders after classification with one-click submit button), `GET /api/submit-report-via-email` (token-protected one-click submission), `POST /api/send-non-fundraising-notice` (notifies users of non-fundraising submissions), and `POST /api/report-violation` (sends violations to ActBlue). **Landing page screenshots** are captured via `POST /api/screenshot-actblue` using Puppeteer when ActBlue URLs are detected, triggering re-classification with landing context. Public board and detail pages are in `web/src/app/cases/page.tsx` and `web/src/app/cases/[id]/page.tsx`, served by `GET /api/cases` and `GET /api/cases/[id]`. Supabase integration is in `web/src/lib/supabase-server.ts` (server) and `web/src/lib/supabase.ts` (browser). Database schema is in `web/src/server/db/schema.ts`. Environment parsing is centralized in `web/src/lib/env.ts`; required vars: `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `HONEYTRAP_EMAILS` (comma-separated, for redaction), and optional `OCRSPACE_API_KEY` (for screenshot OCR).

**End‑to‑end flows** (all converge on classification):

**Email forwarding** (manual + honeytrap bots):
- External: Email → Mailgun webhook → `POST /api/inbound-email`
- Ingest: Parse email, redact honeytrap addresses, clean text → save submission + generate secure token
- Trigger: `triggerPipelines()` (classify + sender + redact-pii in parallel)
- Result: Forwarder receives preview email with violations + one-click "Submit to ActBlue" button
- User submits: Token validates → `POST /api/report-violation` → report sent to ActBlue

**SMS collection** (bot-only, no forwarding yet):
- External: SMS → Twilio webhook → `POST /api/inbound-sms`
- Ingest: Parse SMS, extract text + media URLs → save submission
- Trigger: `triggerPipelines()` (classify + sender in parallel, no redact-pii for SMS)
- Result: Case published at `/cases/{id}` (no email to user)

**Screenshot upload** (manual web UI):
- Client: Drop file → `POST /api/upload` → Storage upload + `POST /api/ocr` → redirect to `/cases/{id}`
- Server: OCR.space extracts text → save to `submissions` → `triggerPipelines()`
- Result: Case published with OCR'd text + violations (no email sent, forwarder_email is NULL)

All three paths use identical deduplication, classification, and violation storage logic. Processing status is tracked via `processing_status` field (queued → ocr → classified → done).