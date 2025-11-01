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
            Transparent record of all reports submitted to ActBlue, including evidence and outcomes.
          </p>
        </header>

        <section className="mx-auto max-w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
          <ReportsTable initialData={data.reports || []} />
        </section>

        <Footer />
      </div>
    </main>
  );
}

