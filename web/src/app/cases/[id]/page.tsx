import { LiveViolations } from "./client";
type CaseItem = {
  id: string;
  image_url: string;
  sender_id: string | null;
  sender_name: string | null;
  raw_text: string | null;
  processing_status?: string | null;
};

type Violation = {
  id: string;
  code: string;
  title: string;
  confidence?: string | number | null;
};

type CaseData = {
  item: CaseItem | null;
  violations: Array<Violation>;
};

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return <main className="p-6">Not found</main>;
  }
  const data = (await res.json()) as CaseData;
  if (!data.item) return <main className="p-6">Not found</main>;

  const item = data.item;
  const imgRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases/${id}/image-url`, { cache: "no-store" });
  const imgData = imgRes.ok ? await imgRes.json() : { url: null };
  const draft = { subject: "", body: "" };
  const isProcessing = !item.raw_text || item.processing_status !== 'done';

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Case {id}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-700">Screenshot</div>
          <div className="border rounded p-2 bg-white">
            {imgData.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgData.url} alt="submission" className="max-w-full h-auto" />
            ) : (
              <div className="text-xs text-gray-500 break-all">{item.image_url}</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-700">Sender</div>
            <div className="font-medium">{item.sender_name || item.sender_id || "Unknown"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-700">Extracted text</div>
            <div className="whitespace-pre-wrap text-sm bg-white border rounded p-3 min-h-24">
              {item.raw_text || "(no text yet)"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-700">Violations</div>
            <LiveViolations id={id} initialViolations={data.violations} initialStatus={item.processing_status ?? null} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-gray-700">Email draft (disabled in MVP)</div>
      </div>
    </main>
  );
}
