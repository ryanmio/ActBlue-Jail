"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertSupabaseBrowser } from "@/lib/supabase";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
};

export default function Home() {
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onBrowseClick = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(async (file: File) => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setStatus("Creating submission…");
    try {
      const create = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg" }),
      });
      if (!create.ok) throw new Error("Failed to create submission");
      const { submissionId, bucket, objectPath } = (await create.json()) as {
        submissionId: string;
        bucket: string;
        objectPath: string;
      };

      setStatus("Uploading + OCR…");
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
      const [{ error }, ocrResp] = await Promise.all([uploadPromise, ocrPromise]);
      if (error) throw error;
      if (!ocrResp.ok) {
        const body = await ocrResp.text().catch(() => "");
        throw new Error(`/api/ocr failed ${ocrResp.status}: ${body}`);
      }
      setStatus("Done – opening case…");
      window.location.href = `/cases/${submissionId}`;
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Upload/OCR failed: ${message}`);
      setIsUploading(false);
    }
  }, [isUploading]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }, [handleFile]);

  return (
    <main
      className="min-h-screen bg-white"
      style={{
        background:
          "radial-gradient(80% 80% at 15% -10%, rgba(4, 156, 219, 0.22), transparent 65%)," +
          "radial-gradient(80% 80% at 92% 0%, rgba(198, 96, 44, 0.20), transparent 65%)," +
          "linear-gradient(to bottom, #eef7ff 0%, #ffffff 45%, #fff2e9 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-10">
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">ActBlue Jail</h1>
          <p className="text-sm text-slate-700">Upload a screenshot to begin. Not affiliated with ActBlue.</p>
        </header>

        {/* Upload card */}
        <section className="mx-auto max-w-xl">
          <div
            onClick={onBrowseClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="cursor-pointer bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center hover:shadow-md transition-shadow"
          >
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-4">⬆️</div>
            <div className="font-medium text-slate-900">Drag & drop or click to upload</div>
            <div className="text-xs text-slate-600 mt-1">PNG, JPG, HEIC, single-page PDF · Max 10MB</div>
            <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onInputChange} />
            {status && (
              <div className="mt-4 text-sm text-slate-800">{status}</div>
            )}
          </div>
        </section>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-8">
          <RecentCases />
          <WorstOffenders />
        </div>

        <footer className="text-xs text-slate-500 text-center pt-6">Not affiliated with ActBlue. Classifications indicate potential policy issues and may be incorrect.</footer>
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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}

type RecentCaseRow = SubmissionRow & { issues: string[] };
function useRecentCases(limit = 6) {
  const [rows, setRows] = useState<RecentCaseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/cases?limit=${limit}`, { cache: "no-store" });
        const json = await res.json();
        const items = (json.items || []) as Array<{ id: string; createdAt: string; senderId: string|null; senderName: string|null; rawText: string|null }>;
        const withIssues = await Promise.all(items.slice(0, limit).map(async (r) => {
          try {
            const resp = await fetch(`/api/cases/${r.id}`, { cache: "no-store" });
            const data = await resp.json();
            const vios = Array.isArray(data.violations) ? data.violations as Array<{ code: string; title: string }> : [];
            return { ...r, issues: vios.slice(0, 3).map(v => v.code) };
          } catch {
            return { ...r, issues: [] as string[] };
          }
        }));
        if (!cancelled) setRows(withIssues.map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          senderId: r.senderId,
          senderName: r.senderName,
          rawText: r.rawText,
          issues: r.issues,
        })));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [limit]);
  return { rows, loading };
}

function RecentCases() {
  const { rows, loading } = useRecentCases(5);
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent cases</h2>
        <Link className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50" href="/cases">View all</Link>
      </div>
      <div className="divide-y">
        {loading && (
          <div className="space-y-3 py-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="animate-pulse py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 w-full">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="flex gap-2">
                    <div className="h-4 bg-slate-200 rounded w-14" />
                    <div className="h-4 bg-slate-200 rounded w-16" />
                    <div className="h-4 bg-slate-200 rounded w-10" />
                  </div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16 shrink-0" />
              </div>
            ))}
          </div>
        )}
        {!loading && rows.map((r) => (
          <div key={r.id} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium truncate max-w-[50vw] text-slate-900">{r.senderName || r.senderId || "Unknown sender"}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                {r.issues.length > 0 ? r.issues.map((code) => (
                  <span key={code} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300">{code}</span>
                )) : (
                  <span className="text-slate-500">No issues yet</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-700 tabular-nums">{formatWhen(r.createdAt)}</div>
              <Link className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800" href={`/cases/${r.id}`}>View</Link>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-700">No cases yet.</div>
        )}
      </div>
    </section>
  );
}

function WorstOffenders() {
  const { rows, loading } = useRecentCases(50);
  const offenders = useMemo(() => {
    const map = new Map<string, { name: string; count: number; latest: string }>();
    for (const r of rows) {
      const name = r.senderName || r.senderId || "Unknown";
      const ex = map.get(name);
      if (!ex) map.set(name, { name, count: 1, latest: r.createdAt });
      else {
        ex.count += 1;
        if (new Date(r.createdAt) > new Date(ex.latest)) ex.latest = r.createdAt;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [rows]);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Worst Offenders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-700">
            <tr>
              <th className="py-2 pr-4">Organization</th>
              <th className="py-2 pr-4">Cases</th>
              <th className="py-2 pr-4">Most recent</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              [...Array(3)].map((_, idx) => (
                <tr key={idx} className="border-t animate-pulse">
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-10" /></td>
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                </tr>
              ))
            )}
            {!loading && offenders.map((o) => (
              <tr key={o.name} className="border-t">
                <td className="py-2 pr-4 text-slate-900">{o.name}</td>
                <td className="py-2 pr-4 tabular-nums text-slate-900">{o.count}</td>
                <td className="py-2 pr-4 text-slate-800">{formatWhen(o.latest)}</td>
              </tr>
            ))}
            {!loading && offenders.length === 0 && (
              <tr>
                <td className="py-6 text-center text-slate-700" colSpan={3}>No offenders yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
