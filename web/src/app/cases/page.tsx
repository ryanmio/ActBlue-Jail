import Link from "next/link";

type SubmissionRow = {
  id: string;
  createdAt: string;
  senderId: string | null;
  senderName: string | null;
  rawText: string | null;
};

async function loadCases(): Promise<SubmissionRow[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rows = (data.items || []) as Array<{ id:string; created_at?:string; createdAt?:string; sender_id?:string|null; senderId?:string|null; sender_name?:string|null; senderName?:string|null; raw_text?:string|null; rawText?:string|null }>;
    return rows.map((r) => ({
      id: r.id,
      createdAt: (r.created_at || r.createdAt || new Date(0).toISOString()) as string,
      senderId: r.sender_id || r.senderId || null,
      senderName: r.sender_name || r.senderName || null,
      rawText: r.raw_text || r.rawText || null,
    }));
  } catch {
    return [];
  }
}

export default async function CasesPage() {
  const base = await loadCases();
  const items: SubmissionRow[] = base.map((r) => ({
    id: r.id,
    createdAt: r.createdAt ?? new Date(0).toISOString(),
    senderId: r.senderId,
    senderName: r.senderName,
    rawText: r.rawText,
  }));
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Cases</h1>
      {items.length === 0 && (
        <div className="text-sm text-gray-600">No cases yet.</div>
      )}
      <div className="divide-y">
        {items.map((it) => (
          <Link key={it.id} href={`/cases/${it.id}`} className="block py-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{it.senderName || it.senderId || "Unknown sender"}</div>
                <div className="text-sm text-gray-600 truncate max-w-xl">{it.rawText || "(no text)"}</div>
              </div>
              <div className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
