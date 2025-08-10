"use client";

import { useEffect, useState } from "react";

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
