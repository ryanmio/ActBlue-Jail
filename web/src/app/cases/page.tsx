import Link from "next/link";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
  issues: string[];
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

async function loadCases(): Promise<SubmissionRow[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases`, { cache: "no-store" });
    if (!res.ok) return [];
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
      issues: [] as string[],
    }));
    const withIssues = await Promise.all(
      base.map(async (row) => {
        try {
          const detailRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases/${row.id}`, { cache: "no-store" });
          if (!detailRes.ok) return row;
          const detail = await detailRes.json();
          const vios = Array.isArray(detail.violations) ? (detail.violations as Array<{ code: string }>) : [];
          return { ...row, issues: vios.slice(0, 3).map((v) => v.code) };
        } catch {
          return row;
        }
      })
    );
    return withIssues;
  } catch {
    return [];
  }
}

export default async function CasesPage() {
  const items = await loadCases();
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
        <nav className="text-sm text-slate-600 flex items-center gap-2">
          <Link className="hover:text-slate-900 transition-colors" href="/">Home</Link>
          <span className="text-slate-400">→</span>
          <span className="text-slate-900 font-medium">Cases</span>
        </nav>

        <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">All cases</h1>
            <div className="text-sm text-slate-600">{items.length} total</div>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-700">No cases yet.</div>
          ) : (
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate max-w-[60vw]">
                      {it.senderName || it.senderId || "Unknown sender"}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                      {it.issues.length > 0 ? (
                        it.issues.map((code) => (
                          <span key={code} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300">
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">No issues yet</span>
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
          )}
        </section>
      </div>
    </main>
  );
}
