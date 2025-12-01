"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type ReportData = {
  report: {
    id: string;
    case_id: string;
    to_email: string;
    cc_email: string | null;
    subject: string;
    body: string;
    screenshot_url: string | null;
    landing_url: string;
    status: string;
    created_at: string;
  };
  case: {
    id: string;
    sender_name: string | null;
    sender_id: string | null;
    raw_text: string | null;
    image_url: string | null;
    created_at: string | null;
    message_type: string | null;
    email_body: string | null;
  };
  verdict: {
    id: string;
    verdict: string;
    explanation: string | null;
    determined_by: string | null;
    created_at: string | null;
    updated_at: string | null;
  } | null;
  violations: Array<{
    code: string;
    title: string;
    actblue_verified?: boolean | null;
  }>;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated;
}

function getVerdictDisplay(verdict: string | null): { label: string; color: string; bgColor: string; borderColor: string } {
  if (!verdict || verdict === "pending") {
    return { label: "Pending", color: "text-muted-foreground", bgColor: "bg-secondary", borderColor: "border-border" };
  }
  switch (verdict) {
    case "violation_confirmed":
      return { label: "Violation Confirmed", color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30" };
    case "no_violation":
      return { label: "No Violation", color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30" };
    case "under_review":
      return { label: "Under Review", color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30" };
    case "resolved":
      return { label: "Resolved", color: "text-muted-foreground", bgColor: "bg-secondary", borderColor: "border-border" };
    default:
      return { label: "Pending", color: "text-muted-foreground", bgColor: "bg-secondary", borderColor: "border-border" };
  }
}

export default function ReportsTable({ initialData, showHeader = true }: { initialData: ReportData[]; showHeader?: boolean }) {
  const router = useRouter();

  if (initialData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No reports have been submitted yet.</p>
        <p className="text-sm mt-2">
          <Link href="/" className="text-primary hover:underline">
            Submit a case
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">All Reports</h2>
          <div className="text-sm text-muted-foreground font-medium">
            {initialData.length} {initialData.length === 1 ? "report" : "reports"} total
          </div>
        </div>
      )}

      {/* Mobile: Card Layout */}
      <div className="md:hidden space-y-4">
        {initialData.map((item) => {
          const verdictDisplay = getVerdictDisplay(item.verdict?.verdict || null);
          const senderName = item.case.sender_name || item.case.sender_id || "Unknown";
          const caseUrl = `/cases/${item.report.case_id}`;

          return (
            <div
              key={item.report.id}
              className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
              role="button"
              tabIndex={0}
              onClick={() => router.push(caseUrl)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(caseUrl);
                }
              }}
            >
              <div className="space-y-4">
                {/* Header: Case Name and Date */}
                <div className="space-y-1">
                  <div className="font-semibold text-foreground text-base leading-tight">{senderName}</div>
                  <div className="text-xs text-muted-foreground">Reported {formatDate(item.report.created_at)}</div>
                </div>

                {/* Evidence - More compact */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                  {item.case.message_type === 'email' && item.case.email_body ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <svg className="w-4 h-4 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email HTML
                    </div>
                  ) : item.report.screenshot_url ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <svg className="w-4 h-4 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Screenshot
                    </div>
                  ) : null}
                  <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <svg className="w-4 h-4 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Landing page
                  </div>
                </div>

                {/* Violations - Better spacing */}
                {item.violations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.violations.slice(0, 2).map((v, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-sm border px-2.5 py-1 text-xs font-medium bg-destructive/10 text-destructive border-destructive/30"
                      >
                        {v.title}
                      </span>
                    ))}
                    {item.violations.length > 2 && (
                      <span className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border border-border px-2.5 py-1 text-xs font-medium">
                        +{item.violations.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* Verdict - Better placement */}
                <div className="pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                  {item.verdict ? (
                    <HoverCard openDelay={100}>
                      <HoverCardTrigger asChild>
                        <button
                          className={`inline-flex items-center rounded-sm px-3 py-1.5 text-xs font-medium ${verdictDisplay.bgColor} ${verdictDisplay.color} border ${verdictDisplay.borderColor} w-fit cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          {verdictDisplay.label}
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-[90vw] max-w-[320px] bg-card border-border shadow-xl" align="start" sideOffset={8}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-border">
                            <h3 className="text-base font-semibold text-foreground">ActBlue Decision</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                              {formatDate(item.verdict.created_at)}
                            </span>
                          </div>
                          
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-center">
                              <span
                                className={`inline-flex items-center rounded-sm px-3.5 py-1 text-sm font-semibold ${verdictDisplay.bgColor} ${verdictDisplay.color} border-2 ${verdictDisplay.borderColor}`}
                              >
                                {verdictDisplay.label}
                              </span>
                            </div>

                            {item.verdict.explanation && (
                              <div className="text-sm text-muted-foreground leading-snug bg-secondary rounded-lg p-2.5 border border-border">
                                {item.verdict.explanation.length > 180
                                  ? `${truncateAtWordBoundary(item.verdict.explanation, 180)}... [More]`
                                  : item.verdict.explanation}
                              </div>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-border">
                            <Link
                              href={caseUrl}
                              className="w-full inline-flex items-center justify-center text-sm px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View case
                            </Link>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <HoverCard openDelay={100}>
                      <HoverCardTrigger asChild>
                        <button className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity">
                          Pending
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-[90vw] max-w-[320px] bg-card border-border shadow-xl" align="start" sideOffset={8}>
                        <div className="space-y-3">
                          <h3 className="text-base font-semibold text-foreground">ActBlue Decision</h3>
                          
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border-2 border-border px-3.5 py-1 text-sm font-semibold">
                              Pending
                            </span>
                          </div>

                          <div className="text-sm text-muted-foreground leading-snug bg-secondary rounded-lg p-2.5 border border-border">
                            As of {formatDate(new Date().toISOString())}, ActBlue has not responded to our community report.
                          </div>

                          <div className="pt-2 border-t border-border">
                            <Link
                              href={caseUrl}
                              className="w-full inline-flex items-center justify-center text-sm px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View case
                            </Link>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table Layout */}
      <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-4 px-6 font-medium text-muted-foreground text-xs">Case</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground text-xs">Reported</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground text-xs">Evidence</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground text-xs">Reported Violations</th>
                <th className="text-left py-4 px-6 font-medium text-muted-foreground text-xs">Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card">
              {initialData.map((item) => {
                const verdictDisplay = getVerdictDisplay(item.verdict?.verdict || null);
                const senderName = item.case.sender_name || item.case.sender_id || "Unknown";
                const caseUrl = `/cases/${item.report.case_id}`;

                return (
                  <tr
                    key={item.report.id}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => router.push(caseUrl)}
                  >
                    <td className="py-5 px-6">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate max-w-[220px] text-sm">
                          {senderName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5">
                          Click to view case
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-muted-foreground whitespace-nowrap text-sm">
                      {formatDate(item.report.created_at)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        {item.case.message_type === 'email' && item.case.email_body ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email HTML
                          </div>
                        ) : item.report.screenshot_url ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Screenshot
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Landing page
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      {item.violations.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {item.violations.slice(0, 2).map((v, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-sm border px-2.5 py-1 text-xs font-medium bg-destructive/10 text-destructive border-destructive/30"
                            >
                              {v.title}
                            </span>
                          ))}
                          {item.violations.length > 2 && (
                            <span className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border border-border px-2.5 py-1 text-xs font-medium">
                              +{item.violations.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/70 italic text-sm">None</span>
                      )}
                    </td>
                    <td className="py-5 px-6" onClick={(e) => e.stopPropagation()}>
                      {item.verdict ? (
                        <HoverCard openDelay={100}>
                          <HoverCardTrigger asChild>
                            <button
                              className={`inline-flex items-center rounded-sm px-3 py-1.5 text-xs font-medium ${verdictDisplay.bgColor} ${verdictDisplay.color} border ${verdictDisplay.borderColor} w-fit cursor-pointer hover:opacity-80 transition-opacity`}
                            >
                              {verdictDisplay.label}
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-[380px] bg-card border-border shadow-xl" align="end" sideOffset={8}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-border">
                                <h3 className="text-base font-semibold text-foreground">ActBlue Decision</h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                                  {formatDate(item.verdict.created_at)}
                                </span>
                              </div>
                              
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-center">
                                  <span
                                    className={`inline-flex items-center rounded-sm px-3.5 py-1 text-sm font-semibold ${verdictDisplay.bgColor} ${verdictDisplay.color} border-2 ${verdictDisplay.borderColor}`}
                                  >
                                    {verdictDisplay.label}
                                  </span>
                                </div>

                                {item.verdict.explanation && (
                                  <div className="text-sm text-muted-foreground leading-snug bg-secondary rounded-lg p-2.5 border border-border">
                                    {item.verdict.explanation.length > 180
                                      ? `${truncateAtWordBoundary(item.verdict.explanation, 180)}... [More]`
                                      : item.verdict.explanation}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2.5 border-t border-border">
                                <Link
                                  href={caseUrl}
                                  className="w-full inline-flex items-center justify-center text-sm px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View case
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                        <HoverCard openDelay={100}>
                          <HoverCardTrigger asChild>
                            <button className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border border-border px-3 py-1.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity">
                              Pending
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-[340px] bg-card border-border shadow-xl" align="end" sideOffset={8}>
                            <div className="space-y-3">
                              <h3 className="text-base font-semibold text-foreground">ActBlue Decision</h3>
                              
                              <div className="flex items-center justify-center">
                                <span className="inline-flex items-center rounded-sm bg-secondary text-muted-foreground border-2 border-border px-3.5 py-1 text-sm font-semibold">
                                  Pending
                                </span>
                              </div>

                              <div className="text-sm text-muted-foreground leading-snug bg-secondary rounded-lg p-2.5 border border-border">
                                As of {formatDate(new Date().toISOString())}, ActBlue has not responded to our community report.
                              </div>

                              <div className="pt-2 border-t border-border">
                                <Link
                                  href={caseUrl}
                                  className="w-full inline-flex items-center justify-center text-sm px-3 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View case
                                </Link>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
