import Link from "next/link";
import { LiveViolations, LiveSender, LiveSummary, RequestDeletionButton } from "./client";
import LocalTime from "@/components/LocalTime";
type CaseItem = {
  id: string;
  image_url: string;
  sender_id: string | null;
  sender_name: string | null;
  raw_text: string | null;
  processing_status?: string | null;
  created_at?: string | null;
  ai_confidence?: number | string | null;
};

type Violation = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity?: number | null;
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
    return <main className="mx-auto max-w-5xl p-6">Not found</main>;
  }
  const data = (await res.json()) as CaseData;
  if (!data.item) return <main className="mx-auto max-w-5xl p-6">Not found</main>;

  const item = data.item;
  const imgRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/cases/${id}/image-url`, { cache: "no-store" });
  const imgData = imgRes.ok ? await imgRes.json() : { url: null };
  const createdAtIso = item.created_at ?? null;
  const isPublic = (item as unknown as { public?: boolean }).public !== false;
  const topViolation = [...(data.violations || [])]
    .sort((a, b) => (Number(b.severity || 0) - Number(a.severity || 0)) || (Number(b.confidence || 0) - Number(a.confidence || 0)))[0];
  const overallConfidence = item.ai_confidence == null ? null : Number(item.ai_confidence);
  const summaryInitial = topViolation?.description || null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-600 flex items-center gap-2 mb-8">
          <Link className="hover:text-slate-900 transition-colors" href="/">Home</Link>
          <span className="text-slate-400">→</span>
          <Link className="hover:text-slate-900 transition-colors" href="/cases">Cases</Link>
          <span className="text-slate-400">→</span>
          <span className="text-slate-900 font-medium truncate">Case Details</span>
        </nav>

        {/* Hero section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                <LiveSender id={id} initialSenderName={item.sender_name} initialSenderId={item.sender_id} />
              </h1>
              <p className="text-slate-600">
                {createdAtIso ? (
                  <>
                    Submitted <LocalTime iso={createdAtIso} />
                  </>
                ) : (
                  ""
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RequestDeletionButton id={id} disabled={!isPublic} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Screenshot column (1/3 on desktop) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Screenshot Evidence</h2>
              <div className="rounded-2xl overflow-hidden bg-slate-50 mx-auto w-full max-w-[480px] md:max-w-[520px] border border-slate-100">
                {imgData.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgData.url} alt="Political message screenshot" className="w-full h-auto max-h-[360px] md:max-h-[400px] object-contain" />
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <div className="text-4xl mb-2">📱</div>
                    <p>Screenshot loading...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right pane spans two columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">AI Analysis Summary</h2>
              <LiveSummary id={id} initialSummary={summaryInitial} initialStatus={item.processing_status ?? null} />
            </div>

            {/* Violations */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Policy Violations</h2>
        <LiveViolations id={id} initialViolations={data.violations} initialStatus={item.processing_status ?? null} initialAiConfidence={item.ai_confidence ?? null} />
            </div>
          </div>
        </div>

        {/* Extracted text full width */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
          {!isPublic && (
            <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm">
              This case is hidden pending deletion review.
            </div>
          )}
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Message Content</h2>
          <div className="bg-slate-50 rounded-2xl p-6 max-h-[50vh] overflow-auto">
            <pre className="whitespace-pre-wrap text-slate-700 leading-relaxed font-mono text-sm">
              {item.raw_text || "Extracting text..."}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
