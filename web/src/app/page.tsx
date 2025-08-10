"use client";

import Link from "next/link";
import { useState } from "react";
import { assertSupabaseBrowser } from "@/lib/supabase";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setStatus("Creating submission…");

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg" }),
    });
    if (!res.ok) {
      setStatus("Failed to create submission");
      return;
    }
    const { submissionId, bucket, objectPath } = (await res.json()) as {
      submissionId: string;
      bucket: string;
      objectPath: string;
    };
    setCreatedId(submissionId);

    setStatus("Preparing upload + OCR…");
    // Run upload and server OCR in parallel
    try {
      const supabase = assertSupabaseBrowser();
      const uploadPromise = supabase.storage.from(bucket).upload(objectPath, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
      });
      const dataUrl = await readAsDataUrl(file);
      const ocrPromise = fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, dataUrl }),
      });
      setStatus("Uploading + OCR…");
      const [{ error }, ocrResp] = await Promise.all([uploadPromise, ocrPromise]);
      if (error) throw error;
      if (!ocrResp.ok) {
        const body = await ocrResp.text().catch(() => "");
        throw new Error(`/api/ocr failed ${ocrResp.status}: ${body}`);
      }
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Upload/OCR failed: ${message}`);
      return;
    }

    setStatus("Done – opening case…");
    try {
      window.location.href = `/cases/${submissionId}`;
      return;
    } catch {}
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">ActBlue Jail (MVP)</h1>
        <p className="text-sm text-gray-600">Not affiliated with ActBlue. Submissions are allegations with evidence; redact PII. No auto-email, drafts only.</p>
      </div>

      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className="mt-4">
          <button
            onClick={handleUpload}
            disabled={!file}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            Upload Screenshot
          </button>
        </div>
        {status && <div className="mt-3 text-sm text-gray-700">{status}</div>}
        {createdId && (
          <div className="mt-2 text-sm">
            Created submission: <Link className="underline" href={`/cases/${createdId}`}>view</Link>
          </div>
        )}
      </div>

      <div>
        <Link className="underline" href="/cases">Browse cases</Link>
        </div>
      </main>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function runBrowserOcr(file: File): Promise<{ text: string; ms: number }> {
  const start = performance.now();
  // Dynamic import to keep initial bundle small
  const mod = await import("tesseract.js");
  const Tesseract: { recognize: (file: File, lang: string, opts: Record<string,string>) => Promise<{ data: { text?: string } }> } = (mod as any).default || (mod as any);
  const { data } = await Tesseract.recognize(
    file,
    "eng",
    {
      workerPath: "https://unpkg.com/tesseract.js@v5.0.3/dist/worker.min.js",
      corePath: "https://unpkg.com/tesseract.js-core@v5.0.0/tesseract-core.wasm.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
    }
  );
  const ms = performance.now() - start;
  const text = String(data?.text || "").trim();
  return { text, ms };
}
