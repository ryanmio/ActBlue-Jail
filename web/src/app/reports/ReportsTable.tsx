"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

function getVerdictDisplay(verdict: string | null): { label: string; color: string; bgColor: string } {
  if (!verdict || verdict === "pending") {
    return { label: "Pending", color: "text-slate-700", bgColor: "bg-slate-100" };
  }
  switch (verdict) {
    case "violation_confirmed":
      return { label: "Violation Confirmed", color: "text-orange-800", bgColor: "bg-orange-50" };
    case "no_violation":
      return { label: "No Violation", color: "text-green-800", bgColor: "bg-green-50" };
    case "under_review":
      return { label: "Under Review", color: "text-blue-800", bgColor: "bg-blue-50" };
    case "resolved":
      return { label: "Resolved", color: "text-slate-700", bgColor: "bg-slate-100" };
    default:
      return { label: "Pending", color: "text-slate-700", bgColor: "bg-slate-100" };
  }
}

export default function ReportsTable({ initialData, showHeader = true }: { initialData: ReportData[]; showHeader?: boolean }) {
  const router = useRouter();

  if (initialData.length === 0) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p>No reports have been submitted yet.</p>
        <p className="text-sm mt-2">
          <Link href="/" className="text-blue-600 hover:underline">
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
          <h2 className="text-xl font-semibold text-slate-900">All Reports</h2>
          <div className="text-sm text-slate-600 font-medium">
            {initialData.length} {initialData.length === 1 ? "report" : "reports"} total
          </div>
        </div>
      )}

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50/50">
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Case</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Reported</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Evidence</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Potential Violations</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {initialData.map((item) => {
                const verdictDisplay = getVerdictDisplay(item.verdict?.verdict || null);
                const senderName = item.case.sender_name || item.case.sender_id || "Unknown";
                const caseUrl = `/cases/${item.report.case_id}`;

                return (
                  <tr
                    key={item.report.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(caseUrl)}
                  >
                    <td className="py-5 px-6">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate max-w-[220px]">
                          {senderName}
                        </div>
                        <div className="text-xs text-slate-600 mt-1.5">
                          Click to view case
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-slate-700 whitespace-nowrap">
                      {formatDate(item.report.created_at)}
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex flex-col gap-1.5 min-w-[140px]">
                        {item.case.message_type === 'email' && item.case.email_body ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email HTML
                          </div>
                        ) : item.report.screenshot_url ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Screenshot
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
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
                              className="inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 text-xs font-medium"
                            >
                              {v.title}
                            </span>
                          ))}
                          {item.violations.length > 2 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 text-xs font-medium">
                              +{item.violations.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-5 px-6">
                      {item.verdict ? (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${verdictDisplay.bgColor} ${verdictDisplay.color} border border-slate-200 w-fit`}
                        >
                          {verdictDisplay.label}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 text-xs font-medium">
                          Pending
                        </span>
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

