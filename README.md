# AB Jail

AB Jail is an open-source project that brings transparency to political fundraising through AI-powered analysis and real-time monitoring.

** IMPORTANT: Submissions =/= Reports to ActBlue.** This is primarily a public transparency project tracking potentially deceptive fundraising practices gathered from user and bot submissions of fundraising messages to our site. We hope to allow for users to report potential account use policy violations to ActBlue via our site, but that feature is on hold pending further discussions.

**Submit manually:** Forward emails to submit@abjail.org, paste text directly, or upload screenshots of deceptive messages. AI extracts senders, checks against ActBlue's rules, drafts reports, and adds cases to a public ledger.

**Monitor automatically:** Seeded phone numbers and email addresses continuously collect fundraising solicitations from campaigns, PACs, and list sellers, creating a real-time feed that builds our database.

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
