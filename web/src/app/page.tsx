"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assertSupabaseBrowser } from "@/lib/supabase";
import { cachedJsonFetch } from "@/lib/client-cache";
import Footer from "@/components/Footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BugReportDialog } from "@/components/bug-report-dialog";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
};

type CaseDetail = { violations?: Array<{ code: string; title: string }> };

export default function Home() {
  const [status, setStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [mode, setMode] = useState<"image" | "text" | "forward">("image");
  const [textValue, setTextValue] = useState<string>("");
  const [textError, setTextError] = useState<string>("");
  const [forwardedCases, setForwardedCases] = useState<Array<{ id: string; status: 'processing' | 'complete'; senderName?: string | null }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  const onBrowseClick = useCallback(() => inputRef.current?.click(), []);

  const handleFile = useCallback(async (file: File) => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setStatus("");
    setStepIndex(0);
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

      // Advance steps as each phase completes (keeps operations concurrent)
      const { error } = await uploadPromise;
      if (error) throw error;
      setStepIndex(1); // Uploading image -> Extracting text

      const ocrResp = await ocrPromise;
      if (ocrResp.status === 409) {
        const j = (await ocrResp.json().catch(() => null)) as { url?: string; caseId?: string } | null;
        const url = j?.url || (j?.caseId ? `/cases/${j.caseId}` : null);
        setStatus("We already have this case. Opening the original...");
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("Duplicate detected but no URL provided");
      }
      if (!ocrResp.ok) {
        const body = await ocrResp.text().catch(() => "");
        throw new Error(`/api/ocr failed ${ocrResp.status}: ${body}`);
      }
      setStepIndex(2); // Extracting text -> Finishing up
      window.location.href = `/cases/${submissionId}`;
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Processing failed: ${message}`);
      setIsUploading(false);
    }
  }, [isUploading]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  }, [handleFile]);

  const [isDragOver, setIsDragOver] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  }, [handleFile]);

  const onCardPaste = useCallback((e: React.ClipboardEvent) => {
    if (isUploading) return;
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length > 0) {
      e.preventDefault();
      void handleFile(files[0]);
      return;
    }
    const pasted = e.clipboardData?.getData("text/plain")?.trim() || "";
    if (pasted.length > 0) {
      e.preventDefault();
      setMode("text");
      setTextValue(pasted);
      setTextError("");
    }
  }, [handleFile, isUploading]);

  const submitText = useCallback(async () => {
    const value = textValue.trim();
    if (value.length < 10) {
      setTextError("Please paste at least 10 characters of text.");
      return;
    }
    setTextError("");
    setIsUploading(true);
    setStatus("");
    setStepIndex(2); // Jump to finishing up for text flow
    try {
      const create = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "text.txt", contentType: "text/plain", mode: "text" }),
      });
      if (!create.ok) throw new Error("Failed to create submission");
      const { submissionId } = (await create.json()) as { submissionId: string };

      const start = Date.now();
      const resp = await fetch("/api/ocr-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, text: value, conf: 1, ms: Date.now() - start }),
      });
      if (resp.status === 409) {
        const j = (await resp.json().catch(() => null)) as { url?: string; caseId?: string } | null;
        const url = j?.url || (j?.caseId ? `/cases/${j.caseId}` : null);
        setStatus("We already have this case. Opening the original...");
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("Duplicate detected but no URL provided");
      }
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`/api/ocr-text failed ${resp.status}: ${body}`);
      }
      window.location.href = `/cases/${submissionId}`;
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : String(e);
      setStatus(`Processing failed: ${message}`);
      setIsUploading(false);
    }
  }, [textValue]);

  // Poll for forwarded email cases when in forward mode
  useEffect(() => {
    if (mode !== "forward") {
      setForwardedCases([]);
      return;
    }

    let cancelled = false;
    const pollInterval = setInterval(async () => {
      try {
        // Poll for submissions created in the last 5 minutes via email
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const supabase = assertSupabaseBrowser();
        const { data, error } = await supabase
          .from('submissions')
          .select('id, created_at, ai_version, sender_name')
          .gte('created_at', fiveMinutesAgo)
          .eq('message_type', 'email')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error || cancelled) return;

        const cases = (data || []).map((c: { id: string; ai_version?: string | null; sender_name?: string | null }) => ({
          id: c.id,
          status: (c.ai_version ? 'complete' : 'processing') as 'processing' | 'complete',
          senderName: c.sender_name ?? null,
        }));

        if (!cancelled) {
          setForwardedCases(cases);
        }
      } catch (err) {
        console.error('Failed to poll for forwarded cases:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [mode]);

  // Cleanup copy tooltip timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  return (
    <main
      className="min-h-[calc(100vh+160px)] bg-white"
      style={{
        background:
          "radial-gradient(80% 80% at 15% -10%, rgba(4, 156, 219, 0.22), transparent 65%)," +
          "radial-gradient(80% 80% at 92% 0%, rgba(198, 96, 44, 0.20), transparent 65%)," +
          "linear-gradient(to bottom, #eef7ff 0%, #ffffff 45%, #fff2e9 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-10 relative">
        {/* Menu Button - Top Right */}
        <div className="absolute top-6 right-6 md:top-10 md:right-10">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100/50 focus:outline-none transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white border border-slate-200 shadow-lg text-slate-900" align="end">
                <DropdownMenuLabel className="text-slate-600 font-semibold">AB Jail</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/about" className="cursor-pointer text-slate-900 hover:bg-slate-100">About</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/cases" className="cursor-pointer text-slate-900 hover:bg-slate-100">All Cases</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/stats" className="cursor-pointer text-slate-900 hover:bg-slate-100">Stats</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-slate-200" />
                
                <DropdownMenuLabel className="text-slate-600 font-semibold">Help Improve</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/evaluation" className="cursor-pointer text-slate-900 hover:bg-slate-100">AI Training</Link>
                  </DropdownMenuItem>
                  <BugReportDialog type="bug">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-slate-900 hover:bg-slate-100">
                      Bug Report
                    </DropdownMenuItem>
                  </BugReportDialog>
                  <BugReportDialog type="feature">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-slate-900 hover:bg-slate-100">
                      Feature Request
                    </DropdownMenuItem>
                  </BugReportDialog>
                  <DropdownMenuItem asChild>
                    <a href="https://github.com/ryanmio/ActBlue-Jail" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                      Edit Code
                      <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-slate-200" />
                
                <DropdownMenuLabel className="text-slate-600 font-semibold">Contact</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <a href="https://github.com/ryanmio/ActBlue-Jail/discussions" target="_blank" rel="noopener noreferrer" className="cursor-pointer text-slate-900 hover:bg-slate-100">
                      GitHub
                      <svg className="w-3 h-3 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
        
        {/* Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">ActBlue Jail</h1>
          <p className="text-sm text-slate-700">Upload a screenshot or paste to begin. Not affiliated with ActBlue.</p>
        </header>

        {/* Upload card */}
        <section className="mx-auto max-w-xl">
          <div
            role="button"
            aria-label="Upload screenshot"
            onClick={mode !== "forward" ? onBrowseClick : undefined}
            onDragOver={mode !== "forward" ? (e) => { e.preventDefault(); setIsDragOver(true); } : undefined}
            onDragLeave={mode !== "forward" ? () => setIsDragOver(false) : undefined}
            onDrop={mode !== "forward" ? onDrop : undefined}
            onPaste={mode !== "forward" ? onCardPaste : undefined}
            className={`relative ${mode !== "forward" ? "cursor-pointer" : ""} rounded-3xl border-2 border-dashed p-8 md:p-10 text-center transition-colors ${
              isDragOver
                ? "border-slate-400 bg-white"
                : "border-slate-300 bg-white/60 hover:border-slate-400 hover:bg-white"
            }`}
            aria-busy={isUploading || undefined}
          >
            {!isUploading && (
              <>
                {/* Segmented control */}
                <div className="inline-flex items-center rounded-full border border-slate-300 bg-white overflow-hidden text-sm mb-5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMode("image"); }}
                    className={`px-3 py-1.5 ${mode === "image" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Screenshot
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMode("text"); }}
                    className={`px-3 py-1.5 border-l border-slate-300 ${mode === "text" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Paste text
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setMode("forward"); }}
                    className={`px-3 py-1.5 border-l border-slate-300 ${mode === "forward" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    Forward
                  </button>
                </div>

                {mode === "image" && (
                  <div className="min-h-[280px] flex flex-col items-center justify-center">
                    <div className="mx-auto w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4">
                      <svg
                        className="w-7 h-7 md:w-8 md:h-8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="text-xl md:text-2xl font-semibold text-slate-900">Drag & drop or click to upload</div>
                    <div className="text-sm text-slate-700 mt-2">PNG, JPG, HEIC, single-page PDF · Max 10MB</div>
                    <div className="mt-4 text-xs md:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                      By uploading, you confirm you have the right to share this content and accept the <Link
                        href="/about#terms"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="underline underline-offset-2 hover:text-slate-900"
                      >
                        Terms
                      </Link>.
                    </div>
                  </div>
                )}

                {mode === "text" && (
                  <div className="max-w-lg mx-auto text-left min-h-[280px]">
                    <label className="block text-sm font-medium text-slate-900 mb-2">Paste the message text</label>
                    <textarea
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-32 md:h-40 rounded-xl border border-slate-300 p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Paste here (Cmd/Ctrl + V). We also detect pasted text automatically on this card."
                    />
                    {textError && <div className="mt-2 text-sm text-red-700">{textError}</div>}
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void submitText(); }}
                        className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                      >
                        Submit text
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const t = (await navigator.clipboard.readText?.()) || "";
                            if (t.trim().length > 0) {
                              setTextValue(t);
                              setTextError("");
                            }
                          } catch {
                            // ignore
                          }
                        }}
                        className="px-3 py-2 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50"
                      >
                        Paste from clipboard
                      </button>
                    </div>
                  </div>
                )}

                {mode === "forward" && (
                  <div className="max-w-lg mx-auto text-center min-h-[280px]">
                    <div className="mb-4">
                      <div className="text-xl md:text-2xl font-semibold text-slate-900 mb-3">Forward emails to</div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-300">
                        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <code className="text-base font-mono text-slate-900">submit@abjail.org</code>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await navigator.clipboard.writeText('submit@abjail.org');
                                setCopied(true);
                                if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current);
                                copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
                              } catch {
                                // ignore
                              }
                            }}
                            className="text-slate-600 hover:text-slate-900"
                            title="Copy to clipboard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          {copied && (
                            <div role="status" aria-live="polite" className="absolute -top-8 right-0 bg-slate-900 text-white text-xs rounded px-2 py-1 shadow">
                              Copied
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                      Please redact any personally identifying information you wish before forwarding.
                    </div>

                    {forwardedCases.length > 0 && (
                      <div className="mt-6 space-y-2">
                        {forwardedCases.map((case_) => (
                          <div key={case_.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900 truncate max-w-[55vw]">
                                {case_.senderName || "Unknown sender"}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                {case_.status === 'processing' ? (
                                  <>
                                    <span className="inline-block h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                                    <span>Processing</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Complete</span>
                                  </>
                                )}
                              </div>
                              {case_.status === 'complete' && (
                                <Link
                                  href={`/cases/${case_.id}`}
                                  className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open case
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {forwardedCases.length === 0 && (
                      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                        Recently forwarded emails will appear here
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {isUploading && (
              <div className="max-w-md mx-auto">
                <div className="text-xl md:text-2xl font-semibold text-slate-900 mb-6">Working on your upload…</div>
                <ol className="flex items-center justify-between gap-2">
                  {['Uploading image', 'Extracting text', 'Finishing up'].map((label, idx) => {
                    const isDone = idx < stepIndex;
                    const isCurrent = idx === stepIndex;
                    return (
                      <li key={label} className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-full border text-xs font-semibold shrink-0 ${
                            isDone ? 'bg-slate-900 text-white border-slate-900' : isCurrent ? 'bg-white text-slate-900 border-slate-900' : 'bg-white text-slate-500 border-slate-300'
                          }`} aria-current={isCurrent ? 'step' : undefined}>
                            {isDone ? '✓' : idx + 1}
                          </div>
                          {idx < 2 && (
                            <div className={`mx-2 h-[2px] flex-1 rounded ${isDone ? 'bg-slate-900' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        <div className={`mt-2 text-center text-xs ${isCurrent ? 'text-slate-900' : 'text-slate-600'}`} aria-live={isCurrent ? 'polite' : undefined}>
                          {label}
                          {isCurrent && (
                            <span className="ml-2 align-middle">
                              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" aria-label="Loading" />
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-6 text-xs text-slate-600">This usually takes a few seconds.</div>
              </div>
            )}

            <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onInputChange} />
            {!isUploading && status && (
              <div className="mt-4 text-sm text-slate-800">{status}</div>
            )}
          </div>
        </section>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-8">
          <RecentCases />
          <WorstOffenders />
        </div>

        <Footer />
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

type RecentCase = {
  id: string;
  created_at: string;
  sender_id: string | null;
  sender_name: string | null;
  raw_text: string | null;
  violations: Array<{ code: string; title: string }>;
};

type WorstOffender = {
  sender_name: string;
  violation_count: number;
  latest_violation_at: string;
};

type HomepageStats = {
  recent_cases: RecentCase[];
  worst_offenders: WorstOffender[];
};

function useHomepageStats() {
  const [stats, setStats] = useState<HomepageStats>({ recent_cases: [], worst_offenders: [] });
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Single API call gets both recent cases and worst offenders
        const url = `/api/homepage-stats?recent=5&offenders=10&days=90`;
        const json = await cachedJsonFetch<HomepageStats>(url, 300_000); // 5 min cache
        if (!cancelled) setStats(json || { recent_cases: [], worst_offenders: [] });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  return { stats, loading };
}

function RecentCases() {
  const { stats, loading } = useHomepageStats();
  const cases = stats.recent_cases || [];
  
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
              <div key={`card-skeleton-${idx}`} className="animate-pulse py-3 flex items-center justify-between gap-4">
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
        {!loading && cases.map((r) => (
          <div key={r.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate max-w-[60vw] text-slate-900">{r.sender_name || r.sender_id || "Unknown sender"}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 flex-wrap">
                {r.violations && r.violations.length > 0 ? (
                  r.violations.slice(0, 3).map((v, idx) => (
                    <span
                      key={`${v.code}-${idx}`}
                      className="inline-flex items-center rounded-full bg-slate-100 pl-3 pr-3.5 py-1 text-[11px] font-medium text-slate-800 border border-slate-300 whitespace-nowrap overflow-hidden text-ellipsis max-w-[56vw] md:max-w-[40vw]"
                      title={v.title}
                    >
                      {v.title}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">No issues</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-16 md:w-20 text-right text-xs text-slate-700 tabular-nums">{formatWhen(r.created_at)}</div>
              <Link className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800" href={`/cases/${r.id}`}>View</Link>
            </div>
          </div>
        ))}
        {!loading && cases.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-700">No cases yet.</div>
        )}
      </div>
    </section>
  );
}

function WorstOffenders() {
  const { stats, loading } = useHomepageStats();
  const offenders = stats.worst_offenders || [];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Worst Offenders</h2>
        <Link className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50" href="/stats">All Stats</Link>
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
                <tr key={`table-skeleton-${idx}`} className="border-t animate-pulse">
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-48" /></td>
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-10" /></td>
                  <td className="py-3 pr-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                </tr>
              ))
            )}
            {!loading && offenders.slice(0, 5).map((o) => (
              <tr key={o.sender_name} className="border-t hover:bg-slate-50">
                <td className="py-2 pr-4 text-slate-900">
                  <Link
                    href={`/cases?q=${encodeURIComponent(o.sender_name)}`}
                    className="text-slate-900 hover:bg-slate-50 rounded px-1"
                    aria-label={`View cases for ${o.sender_name}`}
                  >
                    {o.sender_name}
                  </Link>
                </td>
                <td className="py-2 pr-4 tabular-nums text-slate-900">{o.violation_count}</td>
                <td className="py-2 pr-4 text-slate-800">{formatWhen(o.latest_violation_at)}</td>
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
