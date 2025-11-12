"use client";

import { VIOLATION_POLICIES } from "@/lib/violation-policies";

const DISPLAYED_VIOLATION_CODES = ["AB001", "AB003", "AB004", "AB007", "AB008", "AB009"];

const VIOLATION_OPTIONS = VIOLATION_POLICIES.filter((v: { code: string; title: string; policy: string }) =>
  DISPLAYED_VIOLATION_CODES.includes(v.code)
);

interface CasesFilterFormProps {
  pageSize: number;
  q?: string;
  selectedSenders: string[];
  selectedCodes: string[];
}

export function CasesFilterForm({ pageSize, q, selectedSenders, selectedCodes }: CasesFilterFormProps) {
  return (
    <form action="/cases" method="get" className="space-y-3">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="limit" value={String(pageSize)} />
      {q && <input type="hidden" name="q" value={q} />}
      {selectedSenders.map((sender) => (
        <input key={`sender-${sender}`} type="hidden" name="senders" value={sender} />
      ))}
      <div className="grid grid-cols-1 gap-2">
        {/* Special violation status filters */}
        <label className="flex items-center gap-2 text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
          <input 
            type="checkbox" 
            name="codes" 
            value="ANY_VIOLATION" 
            defaultChecked={selectedCodes.includes("ANY_VIOLATION")} 
            className="accent-slate-900"
            onChange={(e) => {
              const noViolationCheckbox = e.currentTarget.form?.querySelector('input[value="NO_VIOLATION"]') as HTMLInputElement;
              const individualCheckboxes = e.currentTarget.form?.querySelectorAll('input[name="codes"]:not([value="ANY_VIOLATION"]):not([value="NO_VIOLATION"])') as NodeListOf<HTMLInputElement>;
              
              if (e.currentTarget.checked) {
                // Uncheck "No violation" and check all individual violations
                if (noViolationCheckbox) noViolationCheckbox.checked = false;
                individualCheckboxes.forEach(cb => cb.checked = true);
              }
            }}
          />
          <span className="truncate font-medium">Any violation</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
          <input 
            type="checkbox" 
            name="codes" 
            value="NO_VIOLATION" 
            defaultChecked={selectedCodes.includes("NO_VIOLATION")} 
            className="accent-slate-900"
            onChange={(e) => {
              const anyViolationCheckbox = e.currentTarget.form?.querySelector('input[value="ANY_VIOLATION"]') as HTMLInputElement;
              const individualCheckboxes = e.currentTarget.form?.querySelectorAll('input[name="codes"]:not([value="ANY_VIOLATION"]):not([value="NO_VIOLATION"])') as NodeListOf<HTMLInputElement>;
              
              if (e.currentTarget.checked) {
                // Uncheck "Any violation" and uncheck all individual violations
                if (anyViolationCheckbox) anyViolationCheckbox.checked = false;
                individualCheckboxes.forEach(cb => cb.checked = false);
              }
            }}
          />
          <span className="truncate font-medium">No violation</span>
        </label>
        
        {/* Separator */}
        <div className="border-t border-slate-200 my-1"></div>
        
        {/* Individual violation codes */}
        {VIOLATION_OPTIONS.map((opt: { code: string; title: string }) => {
          const checked = selectedCodes.includes(opt.code);
          return (
            <label key={opt.code} className="flex items-center gap-2 text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
              <input 
                type="checkbox" 
                name="codes" 
                value={opt.code} 
                defaultChecked={checked} 
                className="accent-slate-900"
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    const anyViolationCheckbox = e.currentTarget.form?.querySelector('input[value="ANY_VIOLATION"]') as HTMLInputElement;
                    const noViolationCheckbox = e.currentTarget.form?.querySelector('input[value="NO_VIOLATION"]') as HTMLInputElement;
                    if (anyViolationCheckbox) anyViolationCheckbox.checked = false;
                    if (noViolationCheckbox) noViolationCheckbox.checked = false;
                  }
                }}
              />
              <span className="truncate"><span className="text-xs text-slate-500 mr-1">{opt.code}</span>{opt.title}</span>
            </label>
          );
        })}
      </div>
      <div className="flex gap-2 justify-end">
        <a href={`/cases?page=1&limit=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}${selectedSenders.length > 0 ? `&senders=${selectedSenders.join(",")}` : ""}`} className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50">Clear</a>
        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800">Apply</button>
      </div>
    </form>
  );
}

