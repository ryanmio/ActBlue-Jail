/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { randomUUID } from "crypto";
import { getSupabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";

// Lazy import puppeteer deps to avoid edge bundling issues when route is untouched
async function getChromium() {
  const mod = await import("@sparticuz/chromium");
  return (mod as any).default ?? mod;
}
async function getPuppeteerCore() {
  const mod = await import("puppeteer-core");
  return (mod as any).default ?? mod;
}

function isValidActBlueUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host === "actblue.com" || host.endsWith(".actblue.com");
  } catch {
    return false;
  }
}

function resolveLocalChromePath(): string | null {
  const envPath = process.env.CHROME_PATH;
  if (envPath && typeof envPath === "string") return envPath;
  // Common macOS locations
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs") as typeof import("fs");
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return null;
}

type Body = { caseId?: string; url?: string };

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "service_key_missing" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const json = (await req.json().catch(() => null)) as Body | null;
  const caseId = String(json?.caseId || "").trim();
  const url = String(json?.url || "").trim();
  if (!caseId || !url) return NextResponse.json({ error: "missing_args" }, { status: 400 });
  if (!isValidActBlueUrl(url)) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  console.log("/api/screenshot-actblue:start", {
    caseId,
    url,
    node: process.versions?.node,
  });

  // Mark pending state immediately so UI can reflect
  await supabase
    .from("submissions")
    .update({ landing_url: url, landing_render_status: "pending" })
    .eq("id", caseId);

  // Upsert a single landing_page context comment (not shown in UI)
  try {
    const contextText = `landing_page: ${url}`;
    await supabase.from("comments").insert({ submission_id: caseId, content: contextText, kind: "landing_page" });
  } catch {}

  // Attempt screenshot with hard 15s timeout (launch + navigate + capture)
  const timeoutMs = 15000;
  let screenshotBuf: Buffer | null = null;
  let browser: any = null;
  async function takeShot(): Promise<Buffer> {
    const chromium: any = await getChromium();
    const puppeteer: any = await getPuppeteerCore();
    let executablePath: string | null = null;
    try {
      executablePath = await chromium.executablePath();
    } catch {}
    if (!executablePath) executablePath = resolveLocalChromePath();
    const args: string[] = Array.isArray(chromium.args) ? chromium.args.slice() : [];
    // Harden for local/docker/vercel
    for (const a of ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--hide-scrollbars","--ignore-certificate-errors","--window-size=1280,2000"]) {
      if (!args.includes(a)) args.push(a);
    }
    console.log("/api/screenshot-actblue:launching", {
      headless: (chromium.headless as boolean) ?? true,
      exe: executablePath || null,
      argsCount: args.length,
    });
    try {
      browser = await puppeteer.launch({
        args,
        defaultViewport: chromium.defaultViewport || { width: 1280, height: 1200 },
        executablePath: executablePath || undefined,
        headless: (chromium.headless as boolean) ?? true,
      });
    } catch (e) {
      // Retry using system Chrome if the downloaded chromium path is not executable
      const localExe = resolveLocalChromePath();
      console.warn("/api/screenshot-actblue:launch_retry_local", { localExe, message: (e as Error)?.message });
      if (!localExe) throw e;
      browser = await puppeteer.launch({
        args,
        defaultViewport: { width: 1280, height: 1200 },
        executablePath: localExe,
        headless: true,
      });
    }
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(timeoutMs);
    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      );
    } catch {}
    try {
      await page.setViewport({ width: 1280, height: 1200, deviceScaleFactor: 1 });
    } catch {}
    console.log("/api/screenshot-actblue:navigate", { url });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector("body", { timeout: 5000 });
    // Give dynamic form widgets a moment to hydrate and render
    try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 6000 }); } catch {}
    // ActBlue shows a transient "Loading Form..." message; wait for it to disappear when possible
    try {
      await page.waitForFunction(() => {
        try {
          const txt = document.body?.innerText || "";
          return !/Loading\s*Form/i.test(txt);
        } catch { return true; }
      }, { timeout: 6000 });
    } catch {}
    const buf = (await page.screenshot({ fullPage: true, type: "png" })) as Buffer;
    console.log("/api/screenshot-actblue:screenshot_ok", { bytes: buf?.length || 0 });
    return buf;
  }
  let step: "launch" | "navigate" | "screenshot" | "upload" | "unknown" = "launch";
  try {
    screenshotBuf = await Promise.race([
      takeShot(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]) as Buffer;
  } catch (e) {
    // Mark failure and return, but keep the comment we inserted earlier
    console.error("/api/screenshot-actblue:error_pre_upload", {
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
    });
    await supabase
      .from("submissions")
      .update({ landing_render_status: "failed", landing_rendered_at: new Date().toISOString() })
      .eq("id", caseId);
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json({ ok: false, error: "screenshot_failed", step }, { status: 502 });
  }

  try {
    // Upload to Supabase Storage
    const bucket = env.SUPABASE_BUCKET_SCREENSHOTS || "screenshots";
    const objectPath = `${caseId}-${randomUUID()}.png`;
    // Convert Node Buffer to ArrayBuffer for Supabase upload
    const ab = (screenshotBuf as Buffer).buffer.slice((screenshotBuf as Buffer).byteOffset, (screenshotBuf as Buffer).byteOffset + (screenshotBuf as Buffer).byteLength);
    console.log("/api/screenshot-actblue:upload_start", { bucket, objectPath });
    // Ensure bucket exists (no-op if it already does)
    try {
      // @ts-expect-error createBucket is available with service role key
      await (supabase as any)._storage.createBucket(bucket, { public: false });
    } catch {}
    const { data: upload, error: upErr } = await supabase.storage
      .from(bucket)
      .upload(objectPath, ab as ArrayBuffer, {
        contentType: "image/png",
        upsert: false,
        cacheControl: "3600",
      });
    if (upErr) throw upErr;
    const publicUrl = `supabase://${bucket}/${objectPath}`;

    await supabase
      .from("submissions")
      .update({
        landing_url: url,
        landing_screenshot_url: publicUrl,
        landing_rendered_at: new Date().toISOString(),
        landing_render_status: "success",
      })
      .eq("id", caseId);
    console.log("/api/screenshot-actblue:db_updated", { caseId });

    // Update landing_page context with screenshot link via a second insert (still hidden in UI)
    try {
      const comment = `landing_page: ${url}\nscreenshot: ${publicUrl}`;
      await supabase.from("comments").insert({ submission_id: caseId, content: comment, kind: "landing_page" });
    } catch {}

    // Fire-and-forget classify with existing comments included
    try {
      const base = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      void fetch(`${base}/api/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: caseId, includeExistingComments: true }),
      }).catch(() => undefined);
    } catch {}

    return NextResponse.json({ ok: true, screenshotUrl: publicUrl });
  } catch (e) {
    console.error("/api/screenshot-actblue:error_upload", {
      message: (e as Error)?.message,
      stack: (e as Error)?.stack,
    });
    await supabase
      .from("submissions")
      .update({ landing_render_status: "failed", landing_rendered_at: new Date().toISOString() })
      .eq("id", caseId);
    return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}


