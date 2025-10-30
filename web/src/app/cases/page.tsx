import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import Footer from "@/components/Footer";
import { VIOLATION_POLICIES, AUP_HELP_URL } from "@/lib/violation-policies";
import { PageHeader } from "@/components/PageHeader";
import { isBotSubmitted } from "@/lib/badge-helpers";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SenderSearchCombobox } from "@/components/sender-search-combobox";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
  issues: Array<{ code: string; title: string }>;
  messageType?: string | null;
  forwarderEmail?: string | null;
  imageUrl?: string | null;
};

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

// Filter to show only these violation codes in the cases page
const DISPLAYED_VIOLATION_CODES = ["AB001", "AB003", "AB004", "AB007", "AB008", "AB009"];

const VIOLATION_OPTIONS = VIOLATION_POLICIES.filter((v: { code: string; title: string; policy: string }) =>
  DISPLAYED_VIOLATION_CODES.includes(v.code)
);

// Derive a clean one-line preview that skips email metadata headers
function derivePreview(text?: string | null): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  const headerRegex = /^(From|Date|Subject|To|Cc|Bcc|Reply-To):/i;
  for (const raw of lines) {
    // normalize: drop quote markers and leading whitespace
    const line = raw.replace(/^[>\s]+/, "").trim();
    if (!line) continue;
    if (headerRegex.test(line)) continue;
    // Skip the common Gmail divider too
    if (/^-+\s*Forwarded message\s*-+$/i.test(line)) continue;
    return line;
  }
  return text.slice(0, 160);
}

async function loadCases(page = 1, limit = 20, q = "", codes: string[] = [], senders: string[] = []): Promise<{ items: SubmissionRow[]; page: number; limit: number; total: number; hasMore: boolean; offset: number; }>
{
  try {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("limit", String(limit));
    if (q) usp.set("q", q);
    usp.set("include", "top_violations");
    if (codes && codes.length > 0) {
      // Send as comma-separated list for brevity
      usp.set("codes", codes.join(","));
    }
    if (senders && senders.length > 0) {
      // Send as comma-separated list for brevity
      usp.set("senders", senders.join(","));
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases?${usp.toString()}`, { cache: "no-store" });
    if (!res.ok) return { items: [], page, limit, total: 0, hasMore: false, offset: 0 };
    const data = await res.json();
    const rows = (data.items || []) as Array<{
      id: string;
      created_at?: string;
      createdAt?: string;
      sender_id?: string | null;
      senderId?: string | null;
      sender_name?: string | null;
      senderName?: string | null;
      raw_text?: string | null;
      rawText?: string | null;
      issues?: Array<{ code: string; title: string }>;
      message_type?: string | null;
      messageType?: string | null;
      forwarder_email?: string | null;
      forwarderEmail?: string | null;
      image_url?: string | null;
      imageUrl?: string | null;
    }>;
    const withIssues = rows.map((r) => ({
      id: r.id,
      createdAt: (r.created_at || r.createdAt || new Date(0).toISOString()) as string,
      senderId: r.sender_id || r.senderId || null,
      senderName: r.sender_name || r.senderName || null,
      rawText: r.raw_text || r.rawText || null,
      issues: Array.isArray(r.issues)
        ? r.issues.filter((v) => typeof v.code === "string" && v.code.trim()).slice(0, 3)
        : [],
      messageType: r.message_type || r.messageType || null,
      forwarderEmail: r.forwarder_email || r.forwarderEmail || null,
      imageUrl: r.image_url || r.imageUrl || null,
    }));
    return {
      items: withIssues,
      page: Number(data.page) || page,
      limit: Number(data.limit) || limit,
      total: Number(data.total) || withIssues.length,
      hasMore: Boolean(data.hasMore),
      offset: Number(data.offset) || (page - 1) * limit,
    };
  } catch {
    return { items: [], page, limit, total: 0, hasMore: false, offset: 0 };
  }
}

export default async function CasesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp: Record<string, string | string[] | undefined> = searchParams ? await searchParams : {};
  const pageParam = Array.isArray(sp["page"]) ? sp["page"][0] : sp["page"];
  const limitParam = Array.isArray(sp["limit"]) ? sp["limit"][0] : sp["limit"];
  const qParam = Array.isArray(sp["q"]) ? sp["q"][0] : sp["q"];
  // Parse codes from query (supports both repeated and comma-separated)
  const codesParam = sp["codes"];
  const selectedCodes: string[] = Array.isArray(codesParam)
    ? codesParam.flatMap((v) => String(v).split(","))
    : typeof codesParam === "string" && codesParam.length > 0
      ? String(codesParam).split(",")
      : [];
  // Parse senders from query (supports both repeated and comma-separated)
  const sendersParam = sp["senders"];
  const selectedSenders: string[] = Array.isArray(sendersParam)
    ? sendersParam.flatMap((v) => String(v).split(","))
    : typeof sendersParam === "string" && sendersParam.length > 0
      ? String(sendersParam).split(",")
      : [];
  const page = Number(pageParam) || 1;
  const pageSize = Number(limitParam) || 20;
  const q = (qParam || "").toString();
  const { items, total, limit, hasMore } = await loadCases(page, pageSize, q, selectedCodes, selectedSenders);
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
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 relative">
        <PageHeader />
        
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Cases" },
          ]}
          className="mb-2"
        />

        <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8 mt-16">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">All cases</h1>
              <div className="text-sm text-slate-600 md:hidden">{total} total</div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 md:gap-4 md:-mt-8">
              <SenderSearchCombobox selectedSenders={selectedSenders} pageSize={pageSize} codes={selectedCodes} />
              {/* Compact filter dropdown */}
              <div className="relative">
                <details className="[&_summary::-webkit-details-marker]:hidden">
                  <summary className="list-none text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2 cursor-pointer select-none">
                    <span>Filter</span>
                    {selectedCodes.length > 0 && (
                      <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">{selectedCodes.length}</span>
                    )}
                  </summary>
                  <div className="absolute right-0 mt-2 w-72 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-xl md:w-80">
                    <form action="/cases" method="get" className="space-y-3">
                      <input type="hidden" name="page" value="1" />
                      <input type="hidden" name="limit" value={String(pageSize)} />
                      {q && <input type="hidden" name="q" value={q} />}
                      {selectedSenders.map((sender) => (
                        <input key={`sender-${sender}`} type="hidden" name="senders" value={sender} />
                      ))}
                      <div className="grid grid-cols-1 gap-2">
                        {VIOLATION_OPTIONS.map((opt: { code: string; title: string }) => {
                          const checked = selectedCodes.includes(opt.code);
                          return (
                            <label key={opt.code} className="flex items-center gap-2 text-sm text-slate-800 border border-slate-200 rounded-md px-3 py-2 hover:bg-slate-50">
                              <input type="checkbox" name="codes" value={opt.code} defaultChecked={checked} className="accent-slate-900" />
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
                  </div>
                </details>
              </div>
              <div className="text-sm text-slate-600 hidden md:block">{total} total</div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-700">No cases yet.</div>
          ) : (
            <>
              <div className="divide-y">
                {items.map((it) => (
                  <Link key={it.id} href={`/cases/${it.id}`} className="-mx-6 md:-mx-8 px-6 md:px-8 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate max-w-[60vw]">
                        {it.senderName || it.senderId || "Unknown sender"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-700 md:flex-wrap">
                        {it.issues.length === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-medium text-cyan-800 border border-cyan-800">
                            No Violations Detected
                          </span>
                        ) : (
                          <>
                            {it.issues.map((v, idx) => {
                              const policy = VIOLATION_POLICIES.find((p) => p.code === v.code);
                              return (
                                <HoverCard key={`${v.code}-${idx}`} openDelay={200}>
                                  <HoverCardTrigger asChild>
                                    <span
                                      title={v.code}
                                      className={`${idx > 0 ? "hidden md:inline-flex" : "inline-flex"} items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800 border border-orange-200 max-w-[80%] md:max-w-none min-w-0 cursor-help`}
                                    >
                                      <span className="truncate">{v.title}</span>
                                    </span>
                                  </HoverCardTrigger>
                                  {policy && (
                                    <HoverCardContent className="w-96 bg-white border-slate-200" side="top">
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="font-mono text-xs text-slate-500">{policy.code}</div>
                                            <div className="font-semibold text-sm text-slate-900">{policy.title}</div>
                                          </div>
                                        </div>
                                        <p className="text-xs text-slate-700 leading-relaxed">{policy.policy}</p>
                                        <a
                                          href={AUP_HELP_URL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                        >
                                          View full policy
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </a>
                                      </div>
                                    </HoverCardContent>
                                  )}
                                </HoverCard>
                              );
                            })}
                            {it.issues.length > 1 && (
                              <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-800 border border-orange-200 md:hidden">+{it.issues.length - 1} more</span>
                            )}
                          </>
                        )}
                        {/* Desktop-only badges for type and submission source - always show regardless of issues */}
                        {(() => {
                          const type = (it.messageType || '').toLowerCase();
                          const showType = type && type !== 'unknown';
                          const isBot = isBotSubmitted({
                            messageType: it.messageType,
                            imageUrl: it.imageUrl,
                            senderId: it.senderId,
                            forwarderEmail: it.forwarderEmail,
                          });
                          return (
                            <>
                              {showType && (
                                <span className="hidden md:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300">
                                  {type === 'email' && 'Email'}
                                  {type === 'sms' && 'SMS'}
                                  {type === 'mms' && 'MMS'}
                                </span>
                              )}
                              <span className="hidden md:inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300">
                                {isBot ? 'Bot Submitted' : 'User Submitted'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 truncate max-w-[70ch]">
                        {derivePreview(it.rawText) || "(no text)"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-xs text-slate-700 tabular-nums">{formatWhen(it.createdAt)}</div>
                      <span className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white pointer-events-none">
                        View
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <PaginationControls total={total} pageSize={limit} currentPage={page} hasMore={hasMore} q={q} senders={selectedSenders} codes={selectedCodes} />
              </div>
            </>
          )}
        </section>
        <Footer />
      </div>
    </main>
  );
}

function PaginationControls({ total, pageSize, currentPage, hasMore, q, senders, codes }: { total: number; pageSize: number; currentPage: number; hasMore: boolean; q?: string; senders?: string[]; codes?: string[] }) {
  const base = "/cases";
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = currentPage + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (q) params.set("q", q);
    if (senders && senders.length > 0) params.set("senders", senders.join(","));
    if (codes && codes.length > 0) params.set("codes", codes.join(","));
    return `${base}?${params.toString()}`;
  };
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href={buildUrl(prevPage)}
        className={`px-3 py-1.5 rounded-md border ${currentPage <= 1 ? "text-slate-400 border-slate-200 pointer-events-none" : "text-slate-800 border-slate-300 hover:bg-slate-50"}`}
        aria-disabled={currentPage <= 1}
      >
        Previous
      </Link>
      <span className="text-slate-600">Page {currentPage} of {totalPages}</span>
      <Link
        href={buildUrl(nextPage)}
        className={`px-3 py-1.5 rounded-md border ${!hasMore ? "text-slate-400 border-slate-200 pointer-events-none" : "text-slate-800 border-slate-300 hover:bg-slate-50"}`}
        aria-disabled={!hasMore}
      >
        Next
      </Link>
    </div>
  );
}
