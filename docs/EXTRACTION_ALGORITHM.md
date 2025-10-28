# ActBlue Landing URL Extraction Algorithm

## Overview

This document describes the improved algorithm for extracting ActBlue landing page URLs from forwarded fundraising emails. The algorithm prioritizes CTA (call-to-action) tracking links over footer links by using frequency-based base counting and redirect resolution.

## Algorithm Steps

### 1. URL Extraction
- Extract all URLs from both plain text and HTML `href` attributes
- Clean trailing punctuation (`.`, `,`, `;`, `:`, `)`, `]`)
- Apply blacklist filtering to skip:
  - Unsubscribe/manage links (keywords: unsubscribe, optout, preferences, manage, etc.)
  - Social media links (Facebook, Twitter, Instagram, LinkedIn, YouTube)
  - `mailto:` links

### 2. URL Categorization
- **Direct ActBlue URLs**: URLs with `*.actblue.com` domains
- **Non-ActBlue URLs**: Potential CTA tracking links that may redirect to ActBlue

### 3. Base Normalization
For each non-ActBlue URL, normalize to a "base" URL:
- **Special handling for `/go/<id>` patterns**: Base = `origin + /go/<id>`
  - Example: `https://act.example.org/go/11901?refcode=abc` → `https://act.example.org/go/11901`
- **For other paths**: Base = `origin + normalized_pathname`
  - Collapse multiple slashes (`//` → `/`)
  - Remove trailing slashes
  - Example: `https://example.org/donate/page` → `https://example.org/donate/page`

### 4. Frequency Counting
- Count occurrences of each base URL
- Sort by frequency (descending), then by path length (longer = more specific)
- This naturally prioritizes common CTA tracking links over footer links

### 5. Top-5 Base Resolution
For each of the top 5 bases by frequency (in order):
1. Select up to 3 concrete URLs from that base
2. For each URL, follow redirects:
   - Try HEAD request first (3s timeout)
   - Fall back to GET if:
     - HEAD returns 405 Method Not Allowed (common for ngpvan/click trackers)
     - HEAD returns 3xx without Location header (malformed redirect)
   - Follow up to 5 hops
   - Track redirect chain (domain → domain transitions)
3. Check if final URL lands on `*.actblue.com`
4. If found, return the ActBlue base (origin + pathname, no query params)
5. If not, continue to next base

### 6. Fallback to Direct ActBlue Links
If none of the top 5 CTA bases resolve to ActBlue:
- Count frequency of direct ActBlue base URLs
- Return most common direct ActBlue base
- This handles cases where:
  - Only footer links exist
  - CTA tracking servers are down/rate-limited
  - CTA links have expired

### 7. No Result
If no ActBlue URLs found after all attempts, return `null`.

## Why This Works

### Frequency Naturally Prefers CTAs Over Footer
In typical fundraising emails:
- **CTA tracking links**: Appear 20-50 times (buttons, inline links, repeated CTAs)
  - Example: `https://act.wedefendthevote.org/go/11901?...` appears ~30 times
- **Footer links**: Appear 1-3 times (footer unsubscribe, settings, homepage)
  - Example: `https://secure.actblue.com/donate/ms_dtv_footer_2025_mf` appears ~2 times

By sorting bases by frequency and trying top 5 first:
1. Most common CTA base (e.g., `/go/11901` × 30) is attempted first
2. Redirects are followed: `act.wedefendthevote.org → secure.actblue.com/donate/ms_dtv_fr_q12025...`
3. The fundraising-specific ActBlue page is found and selected
4. Footer base is never needed (only used as fallback)

### Guardrails
- **Blacklist prevents accidents**: No unsubscribe/manage links are clicked
- **Limited attempts**: Only top 5 bases, max 3 URLs per base, max 5 hops per URL
- **Timeouts**: 3 seconds per HTTP request
- **Fallback logic**: Direct ActBlue links used if CTA resolution fails

## Logging

The algorithm emits comprehensive structured logs for debugging:

### `/api/inbound-email:html_extraction`
```json
{
  "originalHtmlLength": 150000,
  "hrefCount": 45,
  "sampleHrefs": ["https://act.example.org/go/11901?...", ...]
}
```

### `ingestTextSubmission:url_extraction_sources`
```json
{
  "textLength": 5000,
  "htmlLength": 150000,
  "hrefUrlsExtracted": 45,
  "hasOriginalHtml": true
}
```

### `extractActBlueUrl:{id}:extractCandidates`
```json
{
  "totalUrls": 50,
  "sampleUrls": ["https://act.example.org/go/11901?...", ...]
}
```

### `extractActBlueUrl:{id}:categorized`
```json
{
  "directActBlue": 3,
  "nonActBlue": 35,
  "skipped": 12,
  "skippedReasons": [
    {"url": "mailto:...", "reason": "mailto"},
    {"url": "https://.../unsubscribe", "reason": "blacklist:unsubscribe"}
  ]
}
```

### `extractActBlueUrl:{id}:baseCounts`
```json
{
  "totalBases": 8,
  "top10": [
    {"base": "https://act.example.org/go/11901", "count": 30, "sampleUrl": "..."},
    {"base": "https://secure.actblue.com/donate/ms_dtv_footer_2025_mf", "count": 2, "sampleUrl": "..."}
  ]
}
```

### `extractActBlueUrl:{id}:pickingOrder`
```json
{
  "bases": [
    "https://act.example.org/go/11901",
    "https://example.org/action/donate",
    ...
  ]
}
```

### `extractActBlueUrl:{id}:redirectAttempt`
```json
{
  "base": "https://act.example.org/go/11901",
  "count": 30,
  "urlsToTry": 3
}
```

### `extractActBlueUrl:{id}:redirectAttempt:result`
```json
{
  "base": "https://act.example.org/go/11901",
  "url": "https://act.example.org/go/11901?refcode=abc",
  "hops": [
    "act.example.org → secure.actblue.com",
    "final(200)"
  ],
  "status": "success",
  "finalUrl": "https://secure.actblue.com/donate/ms_dtv_fr_q12025-no-kings-act-2x-mg?..."
}
```

### `extractActBlueUrl:{id}:selectionOutcome` (Success)
```json
{
  "outcome": "success",
  "selectedBase": "https://secure.actblue.com/donate/ms_dtv_fr_q12025-no-kings-act-2x-mg",
  "sourceBase": "https://act.example.org/go/11901",
  "sourceBaseCount": 30,
  "hops": ["act.example.org → secure.actblue.com", "final(200)"]
}
```

### `extractActBlueUrl:{id}:selectionOutcome` (Fallback)
```json
{
  "outcome": "fallback_to_direct",
  "selectedBase": "https://secure.actblue.com/donate/ms_dtv_footer_2025_mf",
  "directActBlueCount": 2,
  "reason": "no_cta_bases_resolved"
}
```

### `extractActBlueUrl:{id}:selectionOutcome` (None Found)
```json
{
  "outcome": "none_found",
  "reason": "no_actblue_urls_after_all_attempts"
}
```

## Files Modified

1. **`web/src/app/api/inbound-email/route.ts`**
   - Added logging for originalHtml extraction metrics
   - Logs href count and sample hrefs before sanitization

2. **`web/src/server/ingest/save.ts`**
   - Complete rewrite of `extractActBlueUrl()` function
   - Added `normalizeToBase()` helper with `/go/<id>` handling
   - Added `shouldSkipUrl()` blacklist checker
   - Updated `followRedirect()` to return structured result with hops
   - Added comprehensive logging at every step
   - Implemented frequency-based top-5 base resolution
   - Added fallback to direct ActBlue links

## Testing Scenarios

### Scenario 1: Defend the Vote PAC (CTA-heavy email)
**Expected:**
- `baseCounts` shows `https://act.wedefendthevote.org/go/11901` count ≈ 30
- Footer base `https://secure.actblue.com/donate/ms_dtv_footer_2025_mf` count ≈ 3
- `pickingOrder` tries `/go/11901` first
- `redirectAttempt` shows hops: `act.wedefendthevote.org → secure.actblue.com`
- `selectionOutcome` selects fundraising base (not footer)

### Scenario 2: Footer-only email
**Expected:**
- `baseCounts` shows only footer ActBlue base(s)
- `pickingOrder` is empty (no non-ActBlue bases)
- `selectionOutcome` selects most common direct ActBlue base

### Scenario 3: Expired/rate-limited CTA trackers
**Expected:**
- `redirectAttempt` logs failures (timeout, 404, etc.)
- `selectionOutcome` falls back to direct ActBlue footer base

### Scenario 4: No ActBlue links
**Expected:**
- `selectionOutcome` returns `none_found`
- `landing_url` is NULL in database

## Benefits

1. **Accurate fundraising page detection**: Finds the actual CTA landing page, not generic footer links
2. **Transparent debugging**: Every decision is logged with clear reasoning
3. **Robust fallback logic**: Handles edge cases (tracker failures, footer-only emails)
4. **Safe operation**: Blacklist prevents clicking unsubscribe/manage links
5. **Performance-bounded**: Limits on bases/URLs/hops/timeouts prevent runaway execution

