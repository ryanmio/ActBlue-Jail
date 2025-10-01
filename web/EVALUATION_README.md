# AI Prompt Evaluation System

This system helps you evaluate and improve your AI classification prompts by comparing AI-generated violations against manual human evaluations.

## Overview

The current AI prompt is over-tagging normal fundraising language as "False/Unsubstantiated Claims" (AB007). This evaluation system allows you to:

1. **Extract sample submissions** with AB007 violations for testing
2. **Manually evaluate submissions** through a web interface
3. **Test different prompt variations** to find the most accurate one
4. **Compare accuracy metrics** (precision, recall, F1 score) across prompts

## Setup

### 1. Database Migration

Run the evaluation benchmarks migration:

```bash
# Run the SQL migration in your Supabase dashboard or via psql
cat sql/2025-09-23_add_evaluation_benchmarks.sql | psql [your-db-connection]
```

### 2. Extract Evaluation Samples

Extract submissions with AB007 violations for testing:

```bash
# Run the extraction script
npx tsx src/scripts/extract-evaluation-samples.ts

# Optional: Insert samples directly into evaluation queue
npx tsx src/scripts/extract-evaluation-samples.ts --insert
```

This will identify and categorize submissions with high-confidence AB007 violations:
- Urgent deadlines and expiring offers
- Hyperbolic fundraising claims
- Impossible numerical claims
- Legal misrepresentations
- Other AB007 violations

## Usage

### 1. Manual Evaluation Interface

Visit `/evaluation` in your browser to start evaluating submissions:

1. **Review each submission** - Read the text content and view any images
2. **Check AI violations** - See what the current AI flagged
3. **Add manual violations** - Tag what you believe should actually be violations
4. **Save your evaluation** - Each evaluation becomes part of the benchmark dataset

### 2. Viewing Results

Visit `/evaluation/results` to see:
- Overall accuracy metrics (precision, recall, F1 score)
- Performance breakdown by violation code
- False positive/false negative analysis
- Recent evaluation history

## Prompt Testing

The system includes three prompt variations to test:

### 1. Original Prompt
The current production prompt with broad AB007 criteria.

### 2. Stricter AB007 Detection
More specific criteria requiring clear evidence of fabrication:
- Only flags specific, verifiable false claims
- Avoids flagging general fundraising hyperbole
- Requires claims that could theoretically be fact-checked

### 3. Conservative AB007 Detection
Only flags the most egregious false claims:
- Mathematical impossibilities (500% matching)
- Definitively false legal claims
- Fabricated deadlines with no supporting system
- Extremely conservative - doubts lead to no flag

## API Endpoints

### GET `/api/evaluation`
Get submissions for evaluation, prioritizing AB007 violations.

**Query Parameters:**
- `limit` (default: 50, max: 100) - Number of submissions to return
- `offset` (default: 0) - Pagination offset
- `includeEvaluated` (default: false) - Include already evaluated submissions

**Response:**
```json
{
  "submissions": [
    {
      "id": "uuid",
      "raw_text": "text content",
      "image_url": "image url",
      "sender_name": "sender name",
      "created_at": "timestamp",
      "violations": [...]
    }
  ]
}
```

### POST `/api/evaluation`
Submit a manual evaluation for a submission.

**Request Body:**
```json
{
  "submissionId": "uuid",
  "manualViolations": [
    {
      "code": "AB007",
      "title": "False/Unsubstantiated Claims",
      "rationale": "Explanation of violation",
      "severity": 3,
      "confidence": 0.8
    }
  ],
  "evaluatorNotes": "Additional notes"
}
```

### GET `/api/evaluation/results`
Get evaluation results and comparison metrics.

**Response:**
```json
{
  "metrics": {
    "totalEvaluations": 25,
    "aiViolations": 45,
    "manualViolations": 32,
    "truePositives": 28,
    "falsePositives": 17,
    "trueNegatives": 0,
    "falseNegatives": 4,
    "precision": 0.62,
    "recall": 0.88,
    "f1Score": 0.73,
    "violationsByCode": {
      "AB007": {
        "aiCount": 35,
        "manualCount": 28,
        "correctCount": 25,
        "incorrectCount": 10
      }
    }
  },
  "evaluations": [...]
}
```

## Key Metrics

### Precision
`True Positives / (True Positives + False Positives)`
- How many AI-flagged violations were actually violations?
- Higher is better (fewer false positives)

### Recall
`True Positives / (True Positives + False Negatives)`
- How many actual violations did the AI catch?
- Higher is better (fewer missed violations)

### F1 Score
`2 * (Precision * Recall) / (Precision + Recall)`
- Harmonic mean of precision and recall
- Balances both metrics

## Best Practices for Manual Evaluation

1. **Be Conservative** - Only flag claims that are clearly and verifiably false
2. **Focus on Specificity** - The claim must be specific enough to be fact-checked
3. **Avoid Hyperbole** - Don't flag common fundraising language like "urgent" or "critical"
4. **Consider Context** - Look at both text and images together
5. **Document Reasoning** - Use the rationale field to explain your decision

## Example Evaluation Scenarios

### Should Flag AB007:
- "Your membership expires tomorrow" (when no membership system exists)
- "This donation is 100% tax-deductible" (when it's not)
- "500% matching program" (mathematically impossible)
- "I voted against X 200% of the time" (impossible statistic)

### Should NOT Flag AB007:
- "Urgent: Democrats need your support now!"
- "This is the most important election of our lifetime"
- "Double your impact with a matched donation"
- "Rush your donation before midnight"
- "Critical deadline approaching"

## Running Prompt Tests

The system includes automated prompt testing capabilities:

```typescript
import { runPromptTest, promptVariations } from '@/server/evaluation/prompt-tester';

// Test a specific submission against all prompt variations
const results = await runAllPromptTests();

// Test a single submission with one prompt
const result = await runPromptTest(submissionId, promptVariations[1]);
```

This will run each prompt variation against your evaluation benchmark and calculate accuracy metrics.

## Monitoring and Iteration

1. **Start with 20-30 evaluations** to establish baseline metrics
2. **Identify patterns** in false positives (what's being over-flagged?)
3. **Test prompt variations** to see which performs best
4. **Iterate on the winning prompt** based on evaluation results
5. **Re-run evaluations** periodically to track improvements

## Troubleshooting

### Common Issues:

1. **No submissions showing up**
   - Check that submissions have AB007 violations with >70% confidence
   - Ensure raw_text is not null or empty
   - Run the sample extraction script

2. **High false positive rate**
   - Consider the "stricter" or "conservative" prompt variations
   - Focus on making AB007 criteria more specific
   - Add examples of what should NOT be flagged

3. **Low recall (missing violations)**
   - Current prompt may be too conservative
   - Consider the original prompt or a hybrid approach
   - Add more specific examples of valid AB007 cases

## Next Steps

1. **Complete initial evaluations** (aim for 25-50 submissions)
2. **Analyze results** to identify the best-performing prompt
3. **Implement the winning prompt** in production
4. **Monitor real-world performance** and iterate as needed
5. **Consider expanding** to evaluate other violation codes
