"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  initialText: string | null;
  initialStatus: string | null | undefined;
};

export function LiveCaseText({ id, initialText, initialStatus }: Props) {
  const [text, setText] = useState<string | null>(initialText);
  const [status, setStatus] = useState<string | null | undefined>(initialStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.item as { raw_text: string | null; processing_status?: string | null };
        if (!cancelled) {
          setText(item?.raw_text ?? null);
          setStatus(item?.processing_status ?? null);
          if (item?.raw_text && item?.processing_status === "done") {
            clearInterval(interval);
          }
        }
      } catch {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <div>
      <div className="whitespace-pre-wrap text-sm bg-white border rounded p-3 min-h-24">
        {text || "(no text yet)"}
      </div>
      {(!text || status !== "done") && (
        <div className="text-xs text-gray-500 mt-1">Processing… this will update automatically.</div>
      )}
    </div>
  );
}

type Violation = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity?: number | null;
  confidence?: string | number | null;
};

type LiveViolationsProps = {
  id: string;
  initialViolations: Array<Violation>;
  initialStatus: string | null | undefined;
  initialAiConfidence?: number | string | null;
};

export function LiveViolations({ id, initialViolations, initialStatus, initialAiConfidence }: LiveViolationsProps) {
  const [violations, setViolations] = useState<Array<Violation>>(initialViolations);
  const [status, setStatus] = useState<string | null | undefined>(initialStatus);
  const [overallConfidence, setOverallConfidence] = useState<number | null>(initialAiConfidence == null ? null : Number(initialAiConfidence));

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.item as { processing_status?: string | null; ai_confidence?: number | string | null };
        const vios = (data.violations ?? []) as Array<Violation>;
        if (!cancelled) {
          setViolations(vios);
          setStatus(item?.processing_status ?? null);
          const oc = item?.ai_confidence;
          setOverallConfidence(oc == null ? null : Number(oc));
          if (item?.processing_status === "done") {
            clearInterval(interval);
          }
        }
      } catch {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (status !== "done") {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="h-4 w-4 inline-block rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" aria-label="Loading" />
        <span>Classifying… this will update automatically.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overallConfidence != null && (
        <div className="text-sm text-slate-600">
          Overall AI confidence: <span className="font-semibold text-slate-900">{(Number(overallConfidence) * 100).toFixed(0)}%</span>
        </div>
      )}

      {violations.length === 0 ? (
        <div className="p-4 bg-slate-50 rounded-xl text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-slate-600">No violations detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => {
            const confidenceNum = v.confidence == null ? null : Number(v.confidence);
            const severityNum = v.severity == null ? null : Number(v.severity);
            
            // Color coding based on severity
            const severityColors = {
              1: "bg-yellow-50 border-l-yellow-400 text-yellow-800",
              2: "bg-yellow-50 border-l-yellow-400 text-yellow-800", 
              3: "bg-orange-50 border-l-orange-400 text-orange-800",
              4: "bg-red-50 border-l-red-400 text-red-800",
              5: "bg-red-50 border-l-red-500 text-red-900"
            };
            
            const colorClass = severityColors[severityNum as keyof typeof severityColors] || "bg-slate-50 border-l-slate-400 text-slate-800";
            
            return (
              <div key={v.id} className={`p-4 rounded-xl border-l-4 ${colorClass}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-wrap min-w-0">
                    <span className="inline-flex items-center bg-white/60 text-current text-xs font-bold px-2 py-1 rounded-md shrink-0">
                      {v.code}
                    </span>
                    <h3 className="font-semibold leading-snug break-words max-w-full min-w-0">
                      {v.title}
                    </h3>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-xs mb-3 opacity-80">
                  {confidenceNum != null && !Number.isNaN(confidenceNum) && (
                    <div className="flex items-center gap-1">
                      <span>Confidence:</span>
                      <span className="font-semibold">{(confidenceNum * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                
                {v.description && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">
                    {v.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type LiveSenderProps = {
  id: string;
  initialSenderName: string | null;
  initialSenderId: string | null;
};

export function LiveSender({ id, initialSenderName, initialSenderId }: LiveSenderProps) {
  const [senderName, setSenderName] = useState<string | null>(initialSenderName);
  const [senderId, setSenderId] = useState<string | null>(initialSenderId);

  useEffect(() => {
    if (senderName) return; // nothing to poll if we already have it
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.item as { sender_name: string | null; sender_id: string | null } | null;
        if (!cancelled && item) {
          if (item.sender_name) {
            setSenderName(item.sender_name);
            clearInterval(interval);
          } else if (item.sender_id && !senderId) {
            setSenderId(item.sender_id);
          }
        }
      } catch {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, senderName, senderId]);

  if (senderName) return <>{senderName}</>;
  if (senderId) return <>{senderId}</>;
  return (
    <span className="inline-flex items-center gap-2 text-slate-700">
      <span className="h-4 w-4 inline-block rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" aria-label="Loading" />
      <span>Identifying sender…</span>
    </span>
  );
}

type LiveSummaryProps = {
  id: string;
  initialSummary: string | null;
  initialStatus: string | null | undefined;
};

export function LiveSummary({ id, initialSummary, initialStatus }: LiveSummaryProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [status, setStatus] = useState<string | null | undefined>(initialStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.item as { processing_status?: string | null } | null;
        const vios = (data.violations ?? []) as Array<{ description?: string | null; severity?: number | null; confidence?: number | string | null }>;
        const serverSummary: string | null | undefined = (data as { summary?: string | null }).summary;
        if (!cancelled) {
          setStatus(item?.processing_status ?? null);
          if (serverSummary != null) {
            setSummary(serverSummary);
          } else {
            const sorted = [...vios].sort((a, b) => (Number(b.severity || 0) - Number(a.severity || 0)) || (Number(b.confidence || 0) - Number(a.confidence || 0)));
            setSummary(sorted[0]?.description ?? null);
          }
          if (item?.processing_status === "done") {
            clearInterval(interval);
          }
        }
      } catch {}
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <p className="text-slate-700 text-base leading-relaxed">
      {summary || "Analysis in progress..."}
    </p>
  );
}

type RequestDeletionButtonProps = {
  id: string;
  disabled?: boolean;
};

export function RequestDeletionButton({ id, disabled }: RequestDeletionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${id}/request-deletion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit request");
      }
      setSubmitted(true);
      setReason("");
      setTimeout(() => router.replace("/"), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit request";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      router.replace("/");
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${disabled ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"}`}
        aria-label="Request deletion"
      >
        Request deletion
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-full flex items-start sm:items-center justify-center p-4">
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Request deletion</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tell us why this case should be removed. An admin will review requests before anything is deleted.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={4}
                      placeholder="Describe why this should be deleted..."
                      className="w-full border rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder-slate-600"
                    />
                  </div>
                  {error && <div className="text-sm text-red-600">{error}</div>}
                  {submitted && <div className="text-sm text-green-700">Thanks! Your request was submitted. This case is now hidden pending admin review.</div>}
                </div>
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50 text-slate-700"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSubmit}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                    disabled={submitting || reason.trim().length === 0}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}


type Comment = {
  id: string;
  content: string;
  created_at?: string | null;
};

type CommentsSectionProps = {
  id: string;
  initialComments: Array<Comment>;
};

export function CommentsSection({ id, initialComments }: CommentsSectionProps) {
  const [comments, setComments] = useState<Array<Comment>>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const remaining = 240 - content.length;
  const atLimit = comments.length >= 10;

  const refreshComments = async () => {
    try {
      const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const rows = (data?.comments ?? []) as Array<Comment>;
      setComments(rows);
    } catch {}
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/cases/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to add comment");
      }
      setContent("");
      setInfo("Comment added. Re-running AI with comments considered…");
      setToast("AI is re-running with your comment");
      // Refresh the page data to ensure latest server-side state is shown
      router.refresh();
      // Also refresh local comments list
      await refreshComments();
      setTimeout(() => setToast(null), 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add comment";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
      {toast && typeof window !== "undefined" && createPortal(
        <div className="fixed top-4 right-4 z-[200]">
          <div className="px-4 py-3 rounded-xl shadow-lg bg-slate-900 text-white text-sm">
            {toast}
          </div>
        </div>,
        document.body
      )}
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Comments</h2>
      <p className="text-sm text-slate-600 mb-4">Adding a comment will immediately re-run the AI policy analysis with all comments considered.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Add a comment</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 240))}
            rows={3}
            placeholder="e.g., I think this may violate the fake match policy…"
            className="w-full border rounded-xl p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder-slate-600"
            maxLength={240}
            disabled={submitting || atLimit}
          />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">{remaining} characters left</span>
            {atLimit && <span className="text-slate-600">Comment limit reached for this case (10)</span>}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-slate-700">{info}</div>}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onSubmit}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={submitting || content.trim().length === 0 || atLimit}
          >
            {submitting ? "Submitting…" : "Submit Comment"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Existing comments</h3>
        {comments.length === 0 ? (
          <div className="text-sm text-slate-600">No comments yet.</div>
        ) : (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap">{c.content}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
