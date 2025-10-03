import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/PageHeader";

export default function AboutPage() {
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
            { label: "About" },
          ]}
          className="mb-2"
        />

        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">About</h1>
          <p className="text-sm text-slate-700">Not affiliated with ActBlue.</p>
        </header>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">What is AB Jail?</h2>
          <p className="text-sm text-slate-700">
            AB Jail is an open-source, community-led transparency project for political fundraising. Donors – especially elderly small-dollar givers – are being bombarded with deceptive texts and emails that erode trust and poison the well for everyone. AB Jail shines a light on these practices: just drag and drop a screenshot, and AI extracts the sender, flags likely violations of ActBlue&apos;s own published rules, generates a ready-to-send report, and adds the case to a public ledger.
          </p>
          <p className="text-sm text-slate-700">
            In addition to uploads, AB Jail continuously parses messages from seeded phone numbers subscribed to campaigns, PACs, and list sellers, creating a real-time feed of fundraising solicitations. Email coverage is next.
          </p>
          <p className="text-sm text-slate-700">
            The goal is to protect donors and safeguard small-dollar fundraising by making patterns public. The entire project is open-source and community-driven – anyone can audit the <a href="https://github.com/ryanmio/ActBlue-Jail#" className="underline hover:no-underline" target="_blank" rel="noopener noreferrer">code</a> or contribute improvements directly.
          </p>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Disclaimer</h2>
          <p className="text-sm text-slate-700">
            This site is not affiliated with ActBlue. Entries are user-submitted allegations of potential policy
            violations. We show evidence snippets and model confidence, and encourage manual review.
          </p>
        </section>

        <section id="terms" className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Terms of Service</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              By using this site, you agree to the following terms. If you do not agree, do not use the site.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Informational use only</span>: The site is provided for informational purposes and does not
                constitute legal advice or create any professional relationship.
              </li>
              <li>
                <span className="font-medium">Your submissions</span>: You represent and warrant that you have all necessary rights to
                upload and share any content you submit, and that your submissions do not infringe the rights of others
                or violate any law. You grant us a non-exclusive license to host, display, and process your submissions
                for the purpose of operating the site.
              </li>
              <li>
                <span className="font-medium">Acceptable use</span>: Do not upload unlawful, harmful, or malicious content, attempt to
                disrupt the service, or misuse any data. We may moderate, remove, or restrict content at our discretion.
              </li>
              <li>
                <span className="font-medium">No warranties</span>: The service is provided “as is” and “as available,” without warranties
                of any kind. We do not guarantee accuracy, completeness, or fitness for a particular purpose.
              </li>
              <li>
                <span className="font-medium">Limitation of liability</span>: To the maximum extent permitted by law, we will not be liable
                for indirect, incidental, special, consequential, or punitive damages, or for loss of data or profits.
              </li>
              <li>
                <span className="font-medium">Changes</span>: We may update these terms at any time. Continued use of the site after changes
                take effect constitutes acceptance of the updated terms.
              </li>
            </ul>
            <p className="text-xs text-slate-600">Last updated: 2025-08-12</p>
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Privacy Policy</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              We respect your privacy and describe below what data we collect and how we use it.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Data we collect</span>: Content you upload (including images and extracted text), basic
                metadata (e.g., filenames and timestamps), and technical information such as IP address, device/browser
                details, and usage logs. Limited analytics may be collected to improve the service.
              </li>
              <li>
                <span className="font-medium">How we use data</span>: To operate and improve the site, provide features like OCR and
                classification, ensure security, and comply with legal obligations.
              </li>
              <li>
                <span className="font-medium">Sharing</span>: We may share data with service providers (e.g., hosting, storage, analytics)
                solely to operate the service, and with authorities when required by law. We do not sell your personal
                information.
              </li>
              <li>
                <span className="font-medium">Retention</span>: We retain data only as long as necessary for the purposes above or as
                required by law. You may request removal of content you uploaded, subject to legal and operational limits.
              </li>
              <li>
                <span className="font-medium">Your choices</span>: You may choose not to upload content that includes personal information.
                For questions or requests regarding your data, please contact the site maintainers.
              </li>
              <li>
                <span className="font-medium">Security</span>: We use reasonable safeguards to protect data, but no method of transmission
                or storage is completely secure.
              </li>
            </ul>
            <p className="text-xs text-slate-600">Last updated: 2025-08-12</p>
          </div>
        </section>
      </div>
    </main>
  );
}

