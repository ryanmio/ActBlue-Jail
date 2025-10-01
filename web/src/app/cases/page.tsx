import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import Footer from "@/components/Footer";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
  issues: Array<{ code: string; title: string }>;
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

async function loadCases(page = 1, limit = 20, q = ""): Promise<{ items: SubmissionRow[]; page: number; limit: number; total: number; hasMore: boolean; offset: number; }>
{
  try {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("limit", String(limit));
    if (q) usp.set("q", q);
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
    }>;
    const base = rows.map((r) => ({
      id: r.id,
      createdAt: (r.created_at || r.createdAt || new Date(0).toISOString()) as string,
      senderId: r.sender_id || r.senderId || null,
      senderName: r.sender_name || r.senderName || null,
      rawText: r.raw_text || r.rawText || null,
      issues: [] as Array<{ code: string; title: string }>,
    }));
    const withIssues = await Promise.all(
      base.map(async (row) => {
        try {
          const detailRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases/${row.id}`, { cache: "no-store" });
          if (!detailRes.ok) return row;
          const detail = await detailRes.json();
          const vios = Array.isArray(detail.violations) ? (detail.violations as Array<{ code: string; title: string }>) : [];
          // Dedupe by code, keep first occurrence order, cap to 3
          const seen = new Set<string>();
          const top = [] as Array<{ code: string; title: string }>;
          for (const v of vios) {
            const c = typeof v.code === "string" ? v.code.trim() : "";
            const t = typeof v.title === "string" ? v.title.trim() : c || "Violation";
            if (!c) continue;
            if (seen.has(c)) continue;
            seen.add(c);
            top.push({ code: c, title: t });
            if (top.length >= 3) break;
          }
          return { ...row, issues: top };
        } catch {
          return row;
        }
      })
    );
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
  const sp: Record<string, string | string[] | undefined> = await (searchParams || Promise.resolve({}));
  const pageParam = Array.isArray(sp["page"]) ? sp["page"][0] : sp["page"];
  const limitParam = Array.isArray(sp["limit"]) ? sp["limit"][0] : sp["limit"];
  const qParam = Array.isArray(sp["q"]) ? sp["q"][0] : sp["q"];
  const page = Number(pageParam) || 1;
  const pageSize = Number(limitParam) || 20;
  const q = (qParam || "").toString();
  const { items, total, limit, hasMore } = await loadCases(page, pageSize, q);
  return (
    <main className="min-h-[calc(100vh+160px)]" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Cases" },
          ]}
          className="mb-2"
        />

        <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">All cases</h1>
              <div className="text-sm text-slate-600 md:hidden">{total} total</div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 md:gap-4 md:-mt-8">
              <form action="/cases" className="flex items-center gap-2 w-full md:w-auto" method="get">
                <input type="hidden" name="page" value="1" />
                <input type="hidden" name="limit" value={String(pageSize)} />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search sender..."
                  className="flex-1 md:w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <button className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800" type="submit">Search</button>
              </form>
              <div className="text-sm text-slate-600 hidden md:block">{total} total</div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-700">No cases yet.</div>
          ) : (
            <>
              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate max-w-[60vw]">
                        {it.senderName || it.senderId || "Unknown sender"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-700 md:flex-wrap">
                        {it.issues.length === 0 ? (
                          <span className="text-slate-500">No issues</span>
                        ) : (
                          <>
                            {it.issues.map((v, idx) => (
                              <span
                                key={`${v.code}-${idx}`}
                                title={v.code}
                                className={`${idx > 0 ? "hidden md:inline-flex" : "inline-flex"} items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300 max-w-[80%] md:max-w-none min-w-0`}
                              >
                                <span className="truncate">{v.title}</span>
                              </span>
                            ))}
                            {it.issues.length > 1 && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300 md:hidden">+{it.issues.length - 1} more</span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 truncate max-w-[70ch]">
                        {it.rawText || "(no text)"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-xs text-slate-700 tabular-nums">{formatWhen(it.createdAt)}</div>
                      <Link className="text-sm px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800" href={`/cases/${it.id}`}>
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <PaginationControls total={total} pageSize={limit} currentPage={page} hasMore={hasMore} q={q} />
              </div>
            </>
          )}
        </section>
        <Footer />
      </div>
    </main>
  );
}

function PaginationControls({ total, pageSize, currentPage, hasMore, q }: { total: number; pageSize: number; currentPage: number; hasMore: boolean; q?: string }) {
  const base = "/cases";
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = currentPage + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center gap-3 text-sm">
      <Link
        href={`${base}?page=${prevPage}&limit=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
        className={`px-3 py-1.5 rounded-md border ${currentPage <= 1 ? "text-slate-400 border-slate-200 pointer-events-none" : "text-slate-800 border-slate-300 hover:bg-slate-50"}`}
        aria-disabled={currentPage <= 1}
      >
        Previous
      </Link>
      <span className="text-slate-600">Page {currentPage} of {totalPages}</span>
      <Link
        href={`${base}?page=${nextPage}&limit=${pageSize}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
        className={`px-3 py-1.5 rounded-md border ${!hasMore ? "text-slate-400 border-slate-200 pointer-events-none" : "text-slate-800 border-slate-300 hover:bg-slate-50"}`}
        aria-disabled={!hasMore}
      >
        Next
      </Link>
    </div>
  );
}
