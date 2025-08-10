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
  confidence?: string | number | null;
};

type LiveViolationsProps = {
  id: string;
  initialViolations: Array<Violation>;
  initialStatus: string | null | undefined;
};

export function LiveViolations({ id, initialViolations, initialStatus }: LiveViolationsProps) {
  const [violations, setViolations] = useState<Array<Violation>>(initialViolations);
  const [status, setStatus] = useState<string | null | undefined>(initialStatus);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cases/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const item = data.item as { processing_status?: string | null };
        const vios = (data.violations ?? []) as Array<Violation>;
        if (!cancelled) {
          setViolations(vios);
          setStatus(item?.processing_status ?? null);
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
    <ul className="list-disc list-inside text-sm">
      {violations.map((v) => (
        <li key={v.id}>
          <span className="font-medium">{v.code}</span>: {v.title} {v.confidence ? `(${v.confidence})` : ""}
        </li>
      ))}
      {violations.length === 0 && <li className="text-gray-500">None</li>}
    </ul>
  );
}
