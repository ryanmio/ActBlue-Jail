import { Metadata } from "next";
import Footer from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/breadcrumb";
import Link from "next/link";
import { headers } from "next/headers";
import ReportsTable from "./ReportsTable";

export const metadata: Metadata = {
  title: "Reports to ActBlue",
  description:
    "Transparent tracking of all reports submitted to ActBlue, including evidence and determinations.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ReportsPage() {
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = `${proto}://${host}`;
  
  const res = await fetch(`${base}/api/reports`, { cache: "no-store" });
  const data = res.ok ? await res.json() : { reports: [] };

  return (
    <main
      className="min-h-screen bg-white"
      style={{
        background:
          "radial-gradient(80% 80% at 15% -10%, rgba(4, 156, 219, 0.22), transparent 65%)," +
          "radial-gradient(80% 80% at 92% 0%, rgba(198, 96, 44, 0.20), transparent 65%)," +
          "linear-gradient(to bottom, #eef7ff 0%, #ffffff 45%, #fff2e9 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-8 md:space-y-10 relative">
        <PageHeader />
        
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Reports to ActBlue" },
          ]}
          className="mb-2"
        />

        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Reports to ActBlue
          </h1>
          <p className="text-sm text-slate-700 max-w-2xl mx-auto">
            Record of all reports submitted to ActBlue through our platform, including evidence and outcomes.
          </p>
        </header>

        <section className="mx-auto max-w-3xl bg-blue-50 border border-blue-200 rounded-xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">About Our Reporting Process</h2>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              All reports to ActBlue are <strong>user-initiated and manually reviewed</strong>—never automated or bot-generated. 
              When a user identifies a potential violation in our public transparency database, they can choose to generate and 
              send a formal report to ActBlue.
            </p>
            <p>
              Each report includes comprehensive evidence: the original message content, screenshots when available, and the live 
              landing page URL for ActBlue to verify. Reports reference specific sections of ActBlue's Acceptable Use Policy (AUP) 
              and explain why the message may violate those terms.
            </p>
            <p>
              This page provides transparency into what has been reported, the evidence submitted, and ActBlue's determinations. 
              Our goal is accountability for all parties: organizations sending messages, ActBlue enforcing their policies, and 
              the public understanding outcomes.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <ReportsTable initialData={data.reports || []} />
        </section>

        <Footer />
      </div>
    </main>
  );
}

