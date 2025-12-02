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
  selectedSources: string[];
  selectedTypes: string[];
}

export function CasesFilterForm({ pageSize, q, selectedSenders, selectedCodes, selectedSources, selectedTypes }: CasesFilterFormProps) {
  return (
    <form action="/cases" method="get" className="space-y-3">
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="limit" value={String(pageSize)} />
      {q && <input type="hidden" name="q" value={q} />}
      {selectedSenders.map((sender) => (
        <input key={`sender-${sender}`} type="hidden" name="senders" value={sender} />
      ))}
      {selectedSources.map((source) => (
        <input key={`source-${source}`} type="hidden" name="sources" value={source} />
      ))}
      {selectedTypes.map((type) => (
        <input key={`type-${type}`} type="hidden" name="types" value={type} />
      ))}
      <div className="grid grid-cols-1 gap-2">
        {/* Special violation status filters */}
        <label className="flex items-center gap-2 text-sm text-foreground border border-border rounded-md px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            name="codes" 
            value="ANY_VIOLATION" 
            defaultChecked={selectedCodes.includes("ANY_VIOLATION")} 
            className="accent-primary"
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
        <label className="flex items-center gap-2 text-sm text-foreground border border-border rounded-md px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors">
          <input 
            type="checkbox" 
            name="codes" 
            value="NO_VIOLATION" 
            defaultChecked={selectedCodes.includes("NO_VIOLATION")} 
            className="accent-primary"
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
        <div className="border-t border-border my-1"></div>
        
        {/* Individual violation codes */}
        {VIOLATION_OPTIONS.map((opt: { code: string; title: string }) => {
          // Show checked by default when ANY_VIOLATION is active, or when this specific code is in the selection
          const checkedByDefault = selectedCodes.includes("ANY_VIOLATION") || selectedCodes.includes(opt.code);
          return (
            <label key={opt.code} className="flex items-center gap-2 text-sm text-foreground border border-border rounded-md px-3 py-2 hover:bg-secondary/50 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                name="codes" 
                value={opt.code} 
                defaultChecked={checkedByDefault}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    const anyViolationCheckbox = e.currentTarget.form?.querySelector('input[value=\"ANY_VIOLATION\"]') as HTMLInputElement;
                    const noViolationCheckbox = e.currentTarget.form?.querySelector('input[value=\"NO_VIOLATION\"]') as HTMLInputElement;
                    if (anyViolationCheckbox) anyViolationCheckbox.checked = false;
                    if (noViolationCheckbox) noViolationCheckbox.checked = false;
                  }
                }}
                className="accent-primary"
              />
              <span className="truncate"><span className="text-xs text-muted-foreground mr-1">{opt.code}</span>{opt.title}</span>
            </label>
          );
        })}
      </div>
      <div className="flex gap-2 justify-end">
        <a href={`/cases?page=1&limit=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}${selectedSenders.length > 0 ? `&senders=${selectedSenders.join(",")}` : ""}${selectedSources.length > 0 ? `&sources=${selectedSources.join(",")}` : ""}${selectedTypes.length > 0 ? `&types=${selectedTypes.join(",")}` : ""}`} className="text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">Clear</a>
        <button type="submit" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Apply</button>
      </div>
    </form>
  );
}

