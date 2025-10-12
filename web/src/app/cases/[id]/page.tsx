export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { headers } from "next/headers";
import { LiveViolations, LiveSender, LiveSummary, RequestDeletionButton, CommentsSection, EvidenceTabs, ReportingCard, ReportThread } from "./client";
import { env } from "@/lib/env";
import LocalTime from "@/components/LocalTime";
import Footer from "@/components/Footer";
import { getSupabaseServer } from "@/lib/supabase-server";
type CaseItem = {
  id: string;
  image_url: string;
  sender_id: string | null;
  sender_name: string | null;
  raw_text: string | null;
  email_body?: string | null;
  processing_status?: string | null;
  created_at?: string | null;
  ai_confidence?: number | string | null;
  message_type?: string | null;
  media_urls?: Array<{ url: string; contentType?: string }>;
};


type Violation = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  severity?: number | null;
  confidence?: string | number | null;
};


type Comment = { id: string; content: string; created_at?: string | null; kind?: string | null };
type CaseData = {
  item: CaseItem | null;
  violations: Array<Violation>;
  comments?: Array<Comment>;
  reports?: Array<{ id: string }>;
  hasReport?: boolean;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  try {
    // Query Supabase directly to avoid depending on internal API/host headers during metadata fetch
    const supabase = getSupabaseServer();
    type Row = { id: string; created_at: string | null; sender_id: string | null; sender_name: string | null };
    const { data: rows } = await supabase
      .from("submissions")
      .select("id, created_at, sender_id, sender_name, public")
      .eq("id", id)
      .eq("public", true)
      .limit(1);

    let item = (rows?.[0] as Row | undefined) || null;
    // Fallback: try internal API with site URL if direct DB read didn't return
    if (!item) {
      try {
        const base = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
        const apiRes = await fetch(`${base}/api/cases/${id}`, { cache: "no-store" });
        if (apiRes.ok) {
          const json = (await apiRes.json()) as { item?: Row | null };
          if (json?.item) item = json.item as Row;
        }
      } catch {}
    }
    if (!item) {
      const title = "Case Not Found";
      const description = "This case could not be found";
      const urlPath = `/cases/${id}`;
      return {
        title,
        description,
        alternates: { canonical: urlPath },
        openGraph: {
          title,
          description,
          type: "website",
          url: urlPath,
          images: ["/opengraph-image.png"],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ["/twitter-image.png"],
        },
      };
    }

    const { data: vioRows } = await supabase
      .from("violations")
      .select("id")
      .eq("submission_id", id);

    const senderName = item.sender_name || item.sender_id || "Unknown Sender";
    const createdAt = item.created_at
      ? new Date(item.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : "Date Unknown";

    const violationCount = Array.isArray(vioRows) ? vioRows.length : 0;
    const violationText = violationCount === 1 ? "violation" : "violations";

    const title = `${senderName} - Case ${id.slice(0, 8)}`;
    const description = `Submitted ${createdAt} • ${violationCount} ${violationText} detected`;
    const urlPath = `/cases/${id}`;
    return {
      title,
      description,
      alternates: { canonical: urlPath },
      openGraph: {
        title,
        description,
        type: "website",
        url: urlPath,
        images: ["/opengraph-image.png"],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["/twitter-image.png"],
      },
    };
  } catch {
    const title = "Case Details";
    const description = "View case details and policy violations";
    return {
      title,
      description,
      alternates: { canonical: `/cases/${id}` },
      openGraph: { title, description, type: "website", url: `/cases/${id}`, images: ["/opengraph-image.png"] },
      twitter: { card: "summary_large_image", title, description, images: ["/twitter-image.png"] },
    };
  }
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
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
  const hasReport = (data as { hasReport?: boolean }).hasReport === true
    || (Array.isArray(data.reports) && data.reports.length > 0);
  const createdAtIso = item.created_at ?? null;
  const isPublic = (item as unknown as { public?: boolean }).public !== false;
  const topViolation = [...(data.violations || [])]
    .sort((a, b) => (Number(b.severity || 0) - Number(a.severity || 0)) || (Number(b.confidence || 0) - Number(a.confidence || 0)))[0];
  const summaryInitial = topViolation?.description || null;
  

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
      <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Cases", href: "/cases" },
            { label: "Case Details" },
          ]}
          className="mb-4"
        />

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-black/5 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Evidence</h2>
              <EvidenceTabs
                caseId={id}
                messageType={item.message_type}
                rawText={item.raw_text}
                emailBody={item.email_body || null}
                screenshotUrl={imgData.url}
                screenshotMime={imgData?.mime || null}
                landingImageUrl={landData?.url || null}
                landingLink={landData?.landingUrl || null}
                landingStatus={landData?.status || null}
              />
            </div>
          </div>

          {/* Right pane */}
          <div className="lg:col-span-1 space-y-6">
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

        {/* Reporting */}
        {!hasReport && (
          <ReportingCard id={id} existingLandingUrl={landData?.landingUrl || null} processingStatus={item.processing_status ?? null} />
        )}

        {/* Report history and replies */}
        <ReportThread id={id} />
        <Footer />
      </div>
    </main>
  );
}
