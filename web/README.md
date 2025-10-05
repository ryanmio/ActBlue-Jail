# AB Jail

AB Jail is an open-source project that brings transparency to political fundraising. The tool allows dragging and dropping screenshots of deceptive texts or emails, where AI extracts the sender, checks against ActBlue's rules, drafts a report, and logs it publicly. Messages from seeded phone numbers are automatically collected to build a real-time feed of these solicitations.

## Structure

- **Frontend**: Pages for viewing cases, uploading screenshots, and an evaluation system to rate AI accuracy.
- **API Routes**: Handle uploads, OCR for text extraction, AI classification of violations, report generation, and more—like screenshotting landing pages or processing inbound SMS.
- **Database**: Schemas for reports, comments, and evaluations, with SQL migrations.
- **AI Integration**: Server-side logic for classifying messages and identifying senders.
- **Components**: UI elements for breadcrumbs, headers, animations, and a landing page scanner.

## Contributing

To contribute, fork the repo, make your changes, and submit a PR. Looking for improvements to AI accuracy, new features, or bug fixes.

### Codebase Overview
- Frontend pages and components: src/app and src/components
- API endpoints: src/app/api
- Server-side logic (including AI): src/server
- Database schemas and migrations: sql/ and src/server/db

For specifics:
- To edit the AI classification prompt: src/server/ai/classify.ts
- To edit the sender extraction prompt: src/server/ai/sender.ts

### Evaluating Changes
After updating AI logic, run the app locally and use the /evaluation page to test accuracy on sample data.

For full dev setup and workflow, see dev-workflow.md.

Not affiliated with ActBlue. See the about page for legal details.
