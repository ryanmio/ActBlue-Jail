/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";

export type DuplicateMatch = {
  match: "exact" | "near" | null;
  caseId?: string;
  distance?: number;
};

export function normalizeText(raw: string): string {
  const s0 = (raw || "").toLowerCase();
  // Strip HTML tags
  const s1 = s0.replace(/<[^>]+>/g, " ");
  // Remove URLs
  const s2 = s1.replace(/https?:\/\/\S+|www\.[^\s]+/g, " ");
  // Remove emails
  const s3 = s2.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " ");
  // Remove punctuation and non-alphanumerics (keep digits/letters/space)
  const s4 = s3.replace(/[^a-z0-9\s]/g, " ");
  // Collapse whitespace
  const s5 = s4.replace(/\s+/g, " ").trim();
  return s5;
}

export function sha256Base64(s: string): string {
  return createHash("sha256").update(s).digest("base64");
}

function hashToken64(token: string): bigint {
  const h = createHash("sha256").update(token).digest();
  // Take first 8 bytes as unsigned 64-bit
  let v = 0n;
  for (let i = 0; i < 8; i++) {
    v = (v << 8n) | BigInt(h[i]);
  }
  return v;
}

function generateTokens(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  for (let i = 0; i < words.length; i++) {
    tokens.push(words[i]);
    if (i + 1 < words.length) tokens.push(`${words[i]}_${words[i + 1]}`);
  }
  return tokens.slice(0, 512); // cap to avoid extreme inputs
}

export function computeSimhash64(text: string): bigint {
  const tokens = generateTokens(text);
  const acc = new Array<number>(64).fill(0);
  for (const t of tokens) {
    const hv = hashToken64(t);
    const weight = 1; // simple equal weighting
    for (let bit = 0; bit < 64; bit++) {
      const mask = 1n << BigInt(bit);
      const isOne = (hv & mask) !== 0n;
      acc[bit] += isOne ? weight : -weight;
    }
  }
  let out = 0n;
  for (let bit = 0; bit < 64; bit++) {
    if (acc[bit] > 0) out |= 1n << BigInt(bit);
  }
  return out;
}

export function hammingDistance64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x !== 0n) {
    x &= x - 1n; // clear lowest set bit
    count++;
  }
  return count;
}

function getDistanceThreshold(): number {
  const t = Number((env as any).DEDUP_SIMHASH_DISTANCE ?? 4);
  return Number.isFinite(t) && t >= 0 ? t : 4;
}

export async function findDuplicateCase(rawText: string): Promise<DuplicateMatch> {
  const supabase = getSupabaseServer();
  const norm = normalizeText(rawText || "");
  if (!norm) return { match: null };
  const normHash = sha256Base64(norm);

  // Fast path: exact
  {
    const { data, error } = await supabase
      .from("submissions")
      .select("id")
      .eq("normalized_hash", normHash)
      .limit(1)
      .maybeSingle();
    if (!error && (data as any)?.id) {
      return { match: "exact", caseId: String((data as any).id), distance: 0 };
    }
  }

  // Near-duplicate via simhash prefilter
  const sim = toSignedBigInt(computeSimhash64(norm));
  const threshold = getDistanceThreshold();
  // Prefilter window: +/- 2^24 as rough bucket window (tunable but wide)
  const window = 1n << 24n;
  const lower = sim - window;
  const upper = sim + window;

  // Supabase returns int8 as string; select simhash64 too
  const { data: rows } = await supabase
    .from("submissions")
    .select("id, simhash64")
    .gte("simhash64", lower.toString())
    .lte("simhash64", upper.toString())
    .limit(200);

  let best: { id: string; dist: number } | null = null;
  for (const r of (rows as Array<{ id: string; simhash64: string | number | null }> | null) || []) {
    const sv = r.simhash64;
    if (sv === null || sv === undefined) continue;
    const other = typeof sv === "string" ? BigInt(sv) : BigInt(sv);
    // Both are signed now, convert back to unsigned for distance calc
    const simUnsigned = sim < 0n ? sim + (1n << 64n) : sim;
    const otherUnsigned = other < 0n ? other + (1n << 64n) : other;
    const dist = hammingDistance64(simUnsigned, otherUnsigned);
    if (dist <= threshold && (!best || dist < best.dist)) {
      best = { id: String(r.id), dist };
      if (dist === 0) break;
    }
  }

  if (best) return { match: best.dist === 0 ? "exact" : "near", caseId: best.id, distance: best.dist };
  return { match: null };
}

function toSignedBigInt(unsigned: bigint): bigint {
  // Convert unsigned 64-bit to signed by wrapping values > MAX_SIGNED
  const MAX_SIGNED = 9223372036854775807n; // 2^63 - 1
  if (unsigned > MAX_SIGNED) {
    return unsigned - (1n << 64n); // wrap to negative
  }
  return unsigned;
}

export function buildDedupeFields(raw: string): { normalized_text: string; normalized_hash: string; simhash64: string } {
  const norm = normalizeText(raw || "");
  const hash = sha256Base64(norm);
  const sim = toSignedBigInt(computeSimhash64(norm)).toString();
  return { normalized_text: norm, normalized_hash: hash, simhash64: sim };
}


