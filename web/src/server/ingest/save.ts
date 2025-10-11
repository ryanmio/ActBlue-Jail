/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import { buildDedupeFields, findDuplicateCase } from "./dedupe";

export type IngestTextParams = {
  text: string; // Cleaned text for AI/heuristics
  rawText?: string; // Original unprocessed text for storage/audit
  senderId?: string | null;
  messageType: "sms" | "email" | "unknown";
  imageUrlPlaceholder?: string;
  emailSubject?: string | null;
  emailBody?: string | null; // Sanitized HTML for display
  emailBodyOriginal?: string | null; // Original unsanitized HTML for URL extraction
  forwarderEmail?: string | null;
  submissionToken?: string | null;
};

export type IngestResult = {
  ok: boolean;
  id?: string;
  error?: string;
  isFundraising?: boolean;
  heuristic?: { score: number; hits: string[] };
  landingUrl?: string | null;
};

function computeHeuristic(text: string): { isFundraising: boolean; score: number; hits: string[] } {
  const t = (text || "").toLowerCase();
  const positive = [
    "donate",
    "donation",
    "chip in",
    "chip-in",
    "contribute",
    "give now",
    "give today",
    "actblue",
    "match",
    "matched",
    "pitch in",
    "$1",
    "$3",
    "$5",
    "$10",
    "$20",
  ];
  let score = 0;
  const hits: string[] = [];
  for (const kw of positive) {
    if (t.includes(kw)) {
      score += 1;
      hits.push(kw);
    }
  }
  const hasDollar = /\$\d{1,4}/.test(t);
  const isFundraising = score >= 2 || (score >= 1 && hasDollar);
  return { isFundraising, score: score + (hasDollar ? 1 : 0), hits };
}

// Follow redirects to resolve tracking URLs (async helper)
async function followRedirect(url: string, maxHops = 5): Promise<string | null> {
  let current = url;
  const hops: string[] = [];
  
  for (let i = 0; i < maxHops; i++) {
    try {
      let res = await fetch(current, { 
        method: "HEAD", 
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ABJail/1.0)" },
        signal: AbortSignal.timeout(3000), // 3s timeout per hop
      });
      
      // Some servers do not support HEAD properly; fallback to GET (without following redirects)
      if (!res.headers.get("location") && (res.status >= 300 && res.status < 400)) {
        res = await fetch(current, {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ABJail/1.0)" },
          signal: AbortSignal.timeout(3000),
        });
      }
      
      const location = res.headers.get("location");
      if (!location) {
        // No redirect header - this is the final destination
        hops.push(`${i}: final(${res.status})`);
        if (i === 0) {
          // First request returned no redirect - might be expired/broken link
          console.log("followRedirect:no_redirect", { url, status: res.status, hops });
        }
        return current;
      }
      
      const next = new URL(location, current).href;
      hops.push(`${i}: ${new URL(current).hostname} -> ${new URL(next).hostname}`);
      current = next;
    } catch (e) {
      // Log WHY it failed
      const error = e instanceof Error ? e.message : String(e);
      hops.push(`${i}: ERROR(${error})`);
      console.log("followRedirect:failed", { url, hops, error });
      return null; // Network error or timeout
    }
  }
  
  console.log("followRedirect:max_hops", { url, hops });
  return current; // Max hops reached
}

async function extractActBlueUrl(text: string): Promise<string | null> {
  const urlPattern = /https?:\/\/[^\s<>"'\)]+/g;
  const matches = text.match(urlPattern) || [];
  const directActBlueUrls: string[] = [];
  const resolvedActBlueUrls: string[] = [];
  const trackingUrls: string[] = [];

  for (const rawUrl of matches) {
    try {
      // Clean trailing punctuation
      const cleaned = rawUrl.replace(/[.,;:)\]]+$/, "");
      const parsed = new URL(cleaned);
      const host = parsed.hostname.toLowerCase();

      // Direct ActBlue domain
      if (host === "actblue.com" || host.endsWith(".actblue.com")) {
        directActBlueUrls.push(cleaned);
      }
      // Treat any non-ActBlue link as a candidate tracking redirect, with safe blacklists
      else {
        const urlLower = cleaned.toLowerCase();
        // Skip obvious non-donation/action links
        if (urlLower.startsWith("mailto:")) continue;
        // Strong unsubscribe/preferences blacklist (paths, params, or hostnames)
        const unsubKeywords = [
          "unsubscribe", "unsub", "optout", "opt-out",
          "emailpref", "email-prefs", "preferences", "prefs",
          "manage", "manage-subscriptions", "update-profile"
        ];
        if (unsubKeywords.some(k => urlLower.includes(k))) continue;
        if (host.includes("facebook.com") || host.includes("twitter.com") || host.includes("x.com") || host.includes("instagram.com") || host.includes("youtube.com") || host.includes("linkedin.com")) continue;
        trackingUrls.push(cleaned);
      }
    } catch {
      continue; // Invalid URL, skip
    }
  }

  // Always attempt to resolve tracking URLs (CTA links) even if footer ActBlue links are present
  if (trackingUrls.length > 0) {
    // Limit concurrent redirect checks to avoid overwhelming the network
    const urlsToCheck = trackingUrls.slice(0, 20); // Max 20 URLs
    console.log("extractActBlueUrl:following_redirects", { 
      total: trackingUrls.length, 
      checking: urlsToCheck.length,
      sample: urlsToCheck.slice(0, 3).map(u => new URL(u).hostname)
    });
    
    const resolved = await Promise.allSettled(
      urlsToCheck.map(async (url) => {
        const final = await followRedirect(url);
        if (!final) return null;
        try {
          const u = new URL(final);
          const host = u.hostname.toLowerCase();
          if (host === "actblue.com" || host.endsWith(".actblue.com")) {
            // Filter out unsubscribe/manage links
            if (u.pathname.includes("unsubscribe") || u.pathname.includes("manage") || u.pathname.includes("preferences")) {
              return null;
            }
            return final;
          }
        } catch {}
        return null;
      })
    );
    
    for (const result of resolved) {
      if (result.status === "fulfilled" && result.value) {
        resolvedActBlueUrls.push(result.value);
      }
    }
    console.log("extractActBlueUrl:redirects_resolved", { 
      found: resolvedActBlueUrls.length,
      samples: resolvedActBlueUrls.slice(0, 2)
    });
  }

  const totalFound = directActBlueUrls.length + resolvedActBlueUrls.length;
  if (totalFound === 0) return null;
  if (totalFound === 1) {
    // Always return base URL (no params)
    try {
      const single = directActBlueUrls[0] || resolvedActBlueUrls[0];
      const u = new URL(single as string);
      return `${u.origin}${u.pathname}`;
    } catch {
      return (directActBlueUrls[0] || resolvedActBlueUrls[0]) as string;
    }
  }

  // Build weighted stats by BASE URL (origin + pathname)
  // - resolved links (from tracking) are weighted higher (CTA signals)
  // - cap direct counts to avoid footer repetition dominating
  // - penalize obvious footer paths
  type BaseStats = { direct: number; resolved: number; withParams: number; pathLength: number; hasFooter: boolean };
  const baseStats = new Map<string, BaseStats>();

  const addUrlToStats = (url: string, kind: "direct" | "resolved") => {
    try {
      const parsed = new URL(url);
      const baseUrl = `${parsed.origin}${parsed.pathname}`;
      const hadParams = parsed.searchParams && Array.from(parsed.searchParams.keys()).length > 0;
      const prev = baseStats.get(baseUrl) || { direct: 0, resolved: 0, withParams: 0, pathLength: parsed.pathname.length, hasFooter: /footer/i.test(parsed.pathname) };
      baseStats.set(baseUrl, {
        direct: prev.direct + (kind === "direct" ? 1 : 0),
        resolved: prev.resolved + (kind === "resolved" ? 1 : 0),
        withParams: prev.withParams + (hadParams ? 1 : 0),
        pathLength: prev.pathLength,
        hasFooter: prev.hasFooter || /footer/i.test(parsed.pathname),
      });
    } catch {
      // ignore
    }
  };

  for (const url of directActBlueUrls) addUrlToStats(url, "direct");
  for (const url of resolvedActBlueUrls) addUrlToStats(url, "resolved");

  if (baseStats.size === 0) return null;

  // Compute weighted score per base
  const candidates = Array.from(baseStats.entries()).map(([base, s]) => {
    const cappedDirect = Math.min(s.direct, 2);
    const footerPenalty = s.hasFooter ? 2 : 0;
    const score = s.resolved * 3 + cappedDirect - footerPenalty;
    return { base, score, stats: s };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.stats.resolved !== a.stats.resolved) return b.stats.resolved - a.stats.resolved;
    if (b.stats.pathLength !== a.stats.pathLength) return b.stats.pathLength - a.stats.pathLength;
    if (b.stats.withParams !== a.stats.withParams) return b.stats.withParams - a.stats.withParams;
    return a.base.localeCompare(b.base);
  });

  const best = candidates[0];
  if (best) {
    console.log("extractActBlueUrl:base_selected", {
      base: best.base,
      score: best.score,
      direct: best.stats.direct,
      resolved: best.stats.resolved,
      footer: best.stats.hasFooter,
    });
    return best.base;
  }
  return null;
}

export async function ingestTextSubmission(params: IngestTextParams): Promise<IngestResult> {
  const supabase = getSupabaseServer();
  const imageUrl = params.imageUrlPlaceholder || "sms://no-image";
  const heur = computeHeuristic(params.text || "");
  const isFundraising = heur.isFundraising;

  // Use raw text for duplicate detection if provided, otherwise use cleaned text
  const textForDedupe = params.rawText || params.text;

  // Duplicate detection before insert
  try {
    const dup = await findDuplicateCase(textForDedupe || "");
    if (dup.match && dup.caseId) {
      console.log("ingestTextSubmission:duplicate_detected", { match: dup.match, caseId: dup.caseId, distance: dup.distance });
      return { ok: false, id: dup.caseId, error: "duplicate" };
    }
  } catch (e) {
    console.warn("ingestTextSubmission:dedupe_failed", String(e));
  }

  const insertRow: Record<string, any> = {
    image_url: imageUrl,
    message_type: params.messageType,
    raw_text: params.text, // Store cleaned text (used by AI)
    sender_id: params.senderId || null,
    processing_status: isFundraising ? "ocr" : "done",
    ocr_method: params.messageType === "sms" ? "sms" : "text",
    is_fundraising: isFundraising,
    public: isFundraising, // hide non-fundraising by default
  };

  // Add email-specific fields
  if (params.emailSubject) {
    insertRow.email_subject = params.emailSubject;
  }
  if (params.emailBody) {
    insertRow.email_body = params.emailBody;
  }
  if (params.forwarderEmail) {
    insertRow.forwarder_email = params.forwarderEmail;
  }
  if (params.submissionToken) {
    insertRow.submission_token = params.submissionToken;
  }

  // Extract ActBlue landing URL from text AND email HTML (tracking links often only in HTML)
  // Use ORIGINAL unsanitized HTML for URL extraction (sanitized HTML has tracking links removed)
  let textWithHtmlLinks = textForDedupe || "";
  const htmlForExtraction = params.emailBodyOriginal || params.emailBody; // Prefer original, fallback to sanitized
  if (htmlForExtraction) {
    // Extract href URLs from HTML using regex
    const hrefPattern = /href=["']([^"']+)["']/gi;
    const hrefMatches = htmlForExtraction.matchAll(hrefPattern);
    const hrefUrls = Array.from(hrefMatches, m => m[1]).join(" ");
    textWithHtmlLinks = textWithHtmlLinks + " " + hrefUrls;
  }
  
  const landingUrl = await extractActBlueUrl(textWithHtmlLinks);
  if (landingUrl) {
    insertRow.landing_url = landingUrl;
  }

  try {
    const fields = buildDedupeFields(textForDedupe || "");
    insertRow.normalized_text = fields.normalized_text;
    insertRow.normalized_hash = fields.normalized_hash;
    insertRow.simhash64 = fields.simhash64; // pass as string for int8 safety
  } catch (e) {
    console.warn("ingestTextSubmission:build_fields_failed", String(e));
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert(insertRow)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  const id = (data as any)?.id as string | undefined;
  console.log("ingestTextSubmission:inserted", { id: id || null, isFundraising, score: heur.score, hits: heur.hits, landingUrl: landingUrl || null });
  return { ok: true, id, isFundraising, heuristic: heur, landingUrl: landingUrl || null };
}

export async function triggerPipelines(submissionId: string) {
  try {
    // For local development, always use localhost even if NEXT_PUBLIC_SITE_URL is set to production
    const isLocal = process.env.NODE_ENV === "development" || !env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL.includes("localhost");
    const base = isLocal ? "http://localhost:3000" : env.NEXT_PUBLIC_SITE_URL;
    console.log("triggerPipelines:start", { submissionId, base, isLocal });
    
    // Fire both requests in parallel and await them (serverless needs this)
    const classifyPromise = fetch(`${base}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(async (r) => {
      const text = await r.text().catch(() => "");
      console.log("triggerPipelines:classify", { status: r.status, body: text?.slice(0, 200) });
    }).catch((e) => {
      console.error("triggerPipelines:classify_error", String(e));
    });
    
    const senderPromise = fetch(`${base}/api/sender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    }).then(async (r) => {
      const text = await r.text().catch(() => "");
      console.log("triggerPipelines:sender", { status: r.status, body: text?.slice(0, 200) });
    }).catch((e) => {
      console.error("triggerPipelines:sender_error", String(e));
    });
    
    // Await both to ensure they complete (Vercel serverless requirement)
    await Promise.all([classifyPromise, senderPromise]);
  } catch (e) {
    console.error("triggerPipelines:exception", String(e));
  }
}


