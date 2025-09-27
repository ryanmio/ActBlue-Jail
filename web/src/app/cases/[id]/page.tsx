export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
import Link from "next/link";
import { LiveViolations, LiveSender, LiveSummary, RequestDeletionButton, CommentsSection, InboundSMSViewer, EvidenceTabs } from "./client";
import { env } from "@/lib/env";
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
  message_type?: string | null;
};


type Violation = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity?: number | null;
  confidence?: string | number | null;
};


type Comment = { id: string; content: string; created_at?: string | null };
type CaseData = {
  item: CaseItem | null;
  violations: Array<Violation>;
  comments?: Array<Comment>;
};

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = env.NEXT_PUBLIC_SITE_URL || "";
  console.log("CaseDetailPage:fetch", { base, id });
  const res = await fetch(`${base}/api/cases/${id}`, { cache: "no-store" });
  if (!res.ok) {
    return <main className="mx-auto max-w-5xl p-6">Not found</main>;
  }
  const data = (await res.json()) as CaseData;
  if (!data.item) return <main className="mx-auto max-w-5xl p-6">Not found</main>;

  const item = data.item;
  const imgRes = await fetch(`${base}/api/cases/${id}/image-url`, { cache: "no-store" });
  const imgData = imgRes.ok ? await imgRes.json() : { url: null } as { url: string | null; mime?: string | null };
  const landRes = await fetch(`${base}/api/cases/${id}/landing-url?ts=${Date.now()}`, { cache: "no-store" });
  const landData = landRes.ok ? await landRes.json() : { url: null, landingUrl: null, status: null } as { url: string | null; landingUrl: string | null; status: string | null };
  const createdAtIso = item.created_at ?? null;
  const isPublic = (item as unknown as { public?: boolean }).public !== false;
  const topViolation = [...(data.violations || [])]
    .sort((a, b) => (Number(b.severity || 0) - Number(a.severity || 0)) || (Number(b.confidence || 0) - Number(a.confidence || 0)))[0];
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
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            {item.message_type === "sms" ? (
              <InboundSMSViewer rawText={item.raw_text} fromNumber={item.sender_id} createdAt={createdAtIso} />
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Evidence</h2>
                <EvidenceTabs
                  caseId={id}
                  messageType={item.message_type}
                  rawText={item.raw_text}
                  screenshotUrl={imgData.url}
                  screenshotMime={imgData?.mime || null}
                  landingImageUrl={landData?.url || null}
                  landingLink={landData?.landingUrl || null}
                  landingStatus={landData?.status || null}
                />
              </div>
            )}
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

        {/* Comments */}
        <CommentsSection id={id} initialComments={data.comments || []} />
      </div>
    </main>
  );
}
