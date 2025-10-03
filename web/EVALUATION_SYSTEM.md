# Evaluation System

A minimal, local evaluation bench for beta testers to evaluate AI violation detection accuracy.

## Overview

This evaluation system allows beta testers to review cases and manually categorize violations, then compare their evaluations against the AI's automatic detection. All progress is stored locally in the browser (no login required), and evaluation data is automatically saved to Supabase for aggregate reporting.

## Features

- **No Login Required**: Uses browser local storage and device fingerprinting
- **Random Shuffle**: Shows cases in random order with deduplication
- **Progress Tracking**: Visual progress bar showing X/20 completed
- **Manual Violation Selection**: All 8 violation codes (AB001-AB008)
- **Notes Field**: Optional evaluator notes (240 character max)
- **Auto-Save**: Evaluations automatically saved to Supabase with IP/device ID
- **Comparison Metrics**: Shows accuracy, precision, recall, false positives/negatives
- **Aggregate Statistics**: Compare individual results to all evaluators combined

## Architecture

### Database Tables

**evaluation_sessions**
- Tracks individual evaluation sessions by device ID
- Stores IP address for aggregate reporting
- Marks completion status after 20 evaluations

**evaluation_responses**
- Individual evaluation responses for each case
- Stores both manual violations and AI violations for comparison
- Links to session and submission

### API Routes

**GET /api/evaluation/samples**
- Returns random submissions with AI-detected violations
- Supports excluding already-evaluated cases
- Query params: `count` (default 20), `exclude` (comma-separated IDs)

**POST /api/evaluation/submit**
- Saves individual evaluation response
- Creates or updates session automatically
- Marks session complete at 20 evaluations
- Body: `{ sessionId?, deviceId, submissionId, manualViolations[], evaluatorNotes?, aiViolations[] }`

**GET /api/evaluation/results**
- Calculates evaluation metrics
- Compares manual vs AI violations
- Query params: `sessionId`, `includeAggregate` (default true)

### Frontend Pages

**/evaluation**
- Main evaluation interface
- Shows one case at a time with image and text
- Displays AI-detected violations
- Allows manual violation selection
- Progress bar and auto-save

**/evaluation/results**
- Results comparison page
- Shows session metrics (your evaluation)
- Shows aggregate metrics (all evaluators)
- Displays accuracy, precision, recall, TP/TN/FP/FN

## Violation Codes

| Code | Description |
|------|-------------|
| AB001 | Misrepresentation/Impersonation |
| AB002 | Direct-Benefit Claim |
| AB003 | Missing Full Entity Name |
| AB004 | Entity Clarity (Org vs Candidate) |
| AB005 | Branding/Form Clarity |
| AB006 | PAC Disclosure Clarity |
| AB007 | False/Unsubstantiated Claims |
| AB008 | Unverified Matching Program |

## Metrics Explained

**Accuracy**: Percentage of cases where AI exactly matches manual evaluation

**Precision**: Of violations AI flagged, what % were correct? (TP / (TP + FP))
- Higher precision = fewer false alarms

**Recall**: Of actual violations, what % did AI catch? (TP / (TP + FN))
- Higher recall = fewer missed violations

**True Positives (TP)**: AI correctly flagged violations
**True Negatives (TN)**: AI correctly didn't flag non-violations
**False Positives (FP)**: AI incorrectly flagged violations
**False Negatives (FN)**: AI missed actual violations

## Database Migration

Run this SQL migration to set up the evaluation tables:

```bash
psql -U postgres -d your_database -f sql/2025-10-01_create_evaluation_system.sql
```

Or apply through Supabase dashboard/migration tool.

## Local Storage Keys

- `eval_device_id`: Unique device identifier
- `eval_session_id`: Current evaluation session ID
- `eval_evaluated_ids`: JSON array of evaluated submission IDs (prevents duplicates)

## Future Enhancements

### Python Local Testing Script

After collecting evaluation data, you can test new prompts locally:

```python3
# Example script structure (not yet implemented)
# 1. Fetch evaluation responses from Supabase
# 2. Run new prompt against same submissions
# 3. Calculate metrics comparing new prompt vs manual evaluations
# 4. Compare to baseline/aggregate metrics
```

This would allow iterating on the AI prompt to improve accuracy without needing to deploy changes.

## Usage Flow

1. User visits `/evaluation`
2. System generates device ID and loads 20 random cases
3. User evaluates each case by selecting violations and adding notes
4. Each evaluation auto-saves to Supabase
5. Progress tracked locally (survives page refresh)
6. After 20 evaluations, user can view results
7. Results page shows comparison metrics
8. User can start new evaluation or return home

## Development

To add this to your local development:

1. Apply SQL migration
2. Update `schema.ts` with new table definitions (already done)
3. Ensure Supabase environment variables are set
4. Visit `/evaluation` to test

## Notes

- Uses Next.js App Router (client components for interactivity)
- Tailwind CSS for styling
- Supabase for database (server-side queries via service role)
- No authentication required (intentional for beta testing)
- IP address capture for aggregate analysis (privacy consideration)

