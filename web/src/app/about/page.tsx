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
          <h2 className="text-lg font-semibold text-slate-900">Legal Disclaimer</h2>
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Purpose and scope</h3>
              <p>
                AB Jail is an open-source, community-led transparency project that documents potential fundraising policy violations. The site is for research, journalism, and public accountability. It is not a court of law and it does not adjudicate facts.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">No affiliation</h3>
              <p>
                AB Jail is not affiliated with ActBlue, ActBlue Civics, ActBlue Charities, Numero, NGP, ClickToWin, or any campaign, PAC, nonprofit, platform, vendor, or payment processor mentioned on this site. References to third-party names, policies, trademarks, or products are for identification and reporting purposes only and do not imply endorsement or association.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">User-submitted and automatically processed content</h3>
              <p>
                Materials on this site may include user uploads and messages received by AB Jail via seeded "honeytrap" phone numbers and email addresses. AB Jail uses automated tools to extract text, identify senders, and label potential policy issues. Automated labels are probabilistic, may be incomplete or incorrect, and should be treated as leads for further review – not as definitive findings.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">No statements of fact about unlawful conduct</h3>
              <p>
                Entries on this site describe alleged or potential practices as they appear in the submitted materials and relevant public policies. Unless expressly stated, AB Jail does not assert that any person or entity violated a law or regulation. Descriptions and summaries are presented as opinions based on disclosed facts – namely the quoted message content, links, and screenshots included in each case.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Reporting facilitation only</h3>
              <p>
                Where the site generates a prefilled email or other draft to help users report a case to a platform, that draft is a convenience feature. AB Jail does not submit reports on a user's behalf in the MVP, does not guarantee any outcome, and does not represent any user before any platform or authority.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Uploader representations</h3>
              <p>
                By submitting content, uploaders represent and warrant that they have the right to share the materials; that submissions do not include sensitive personal data beyond what is necessary for reporting; and that any personal information of private individuals has been removed or will be redacted. Uploaders agree not to submit malware, illegal content, or knowingly false materials.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Takedown, corrections, and disputes</h3>
              <p>
                If you are a referenced individual or organization and believe a case is inaccurate, incomplete, contains privileged or private information, or infringes your rights, contact us at <a href="mailto:democratdonor+legal@gmail.com" className="underline hover:no-underline">democratdonor+legal@gmail.com</a> with the case URL and specific concerns. AB Jail will review good-faith requests and may annotate, correct, redact, or remove content at its discretion. Providing clarifying documentation may expedite resolution.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Trademarks and nominative fair use</h3>
              <p>
                "ActBlue" and other names and logos on this site may be trademarks of their respective owners. AB Jail uses such marks solely to identify the platforms or policies referenced, consistent with nominative fair use. No sponsorship or endorsement is claimed.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">No legal advice</h3>
              <p>
                Nothing on this site is legal, financial, or compliance advice. For advice about your specific situation, consult qualified counsel. AB Jail's contributors and maintainers are not your lawyers.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">No warranties</h3>
              <p>
                The site and all content are provided "as is" and "as available" – without warranties of any kind, express or implied, including accuracy, completeness, reliability, or fitness for a particular purpose. AB Jail does not guarantee that any platform will take action on any report.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Limitation of liability</h3>
              <p>
                To the maximum extent permitted by law, AB Jail, its contributors, and maintainers are not liable for any indirect, incidental, special, consequential, or exemplary damages, or for any lost profits, goodwill, or data, arising from or related to use of the site or reliance on its content.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Indemnification</h3>
              <p>
                By using this site, you agree to indemnify and hold harmless AB Jail, its contributors, and maintainers from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising from your submissions or your use or misuse of the site.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Content moderation</h3>
              <p>
                AB Jail may refuse, remove, or restrict content that is abusive, unlawful, defamatory, deceptive, spam, malware, or otherwise inconsistent with the project's purpose or applicable policies. Moderation decisions are discretionary and may change as new information becomes available.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Governing Law and Venue</h3>
              <p>
                These terms and any dispute arising out of or relating to this site are governed by the laws of the District of Columbia, without regard to its conflicts-of-law rules. The exclusive venue for any permitted action shall be the Superior Court of the District of Columbia or, where federal jurisdiction is mandatory, the U.S. District Court for the District of Columbia, and the parties consent to personal jurisdiction in those courts.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Contact</h3>
              <p>
                For legal, takedown, or correction requests: <a href="mailto:democratdonor+legal@gmail.com" className="underline hover:no-underline">democratdonor+legal@gmail.com</a><br />
                For press: <a href="mailto:democratdonor+press@gmail.com" className="underline hover:no-underline">democratdonor+press@gmail.com</a>
              </p>
            </div>
          </div>
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

