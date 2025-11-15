"use client";

import { useState } from "react";

export default function AboutReportingCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mx-auto max-w-3xl bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">
        About Our Reporting Process
      </h2>

      <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
        <p>
          All reports to ActBlue are <strong>user-initiated and manually reviewed</strong>—never automated or
          bot-generated. When a user receives a fundraising message they believe violates ActBlue&apos;s policies,
          they can choose to generate and send a formal report to ActBlue.
        </p>

        {!expanded ? null : (
          <>
            <p>
              Each report includes comprehensive evidence: the original message content, screenshots when available,
              and the live landing page URL for ActBlue to verify. Reports reference specific sections of
              ActBlue&apos;s Acceptable Use Policy (AUP) and explain why the message may violate those terms.
            </p>
            <p>
              This page provides transparency into what has been reported, the evidence submitted, and
              ActBlue&apos;s determinations. Our goal is accountability for all parties: organizations sending
              messages, ActBlue enforcing their policies, and the public understanding outcomes.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
        aria-expanded={expanded}
        aria-controls="about-reporting-content"
      >
        {expanded ? "Less" : "More"}
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.958a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </section>
  );
}


