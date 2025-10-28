import Link from "next/link";
import { Metadata } from "next";
import Footer from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import { Breadcrumb } from "@/components/breadcrumb";
import { VIOLATION_POLICIES, AUP_HELP_URL } from "@/lib/violation-policies";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Learn how to use AB Jail to report potential ActBlue policy violations in political fundraising messages.",
};

export default function WelcomePage() {
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
            { label: "How it works" },
          ]}
          className="mb-2"
        />

        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">How it works</h1>
          <p className="text-sm text-slate-700">Not affiliated with ActBlue.</p>
        </header>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Quick start</h2>
          <ol className="list-decimal list-inside text-slate-700 space-y-1">
            <li>Forward a fundraising email to <code className="bg-slate-100 px-1.5 py-0.5 rounded">submit@abjail.org</code> <em>or</em> upload a screenshot.</li>
            <li>We process it, create a public case, and flag potential policy issues.</li>
            <li>
              Submit the report to ActBlue:
              <span className="block pl-5">
                • If you <strong>forwarded</strong>, use the &ldquo;Submit to ActBlue&rdquo; link in the email we send you.<br />
                • If you <strong>uploaded</strong>, click <em>Submit to ActBlue</em> on the case page.
              </span>
              We&apos;ll track any replies on the case.
            </li>
          </ol>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              How to submit a message
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              There are three ways to submit a political fundraising message:
            </p>

            <div className="space-y-6">
              {/* Forward email (BEST) */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Forward email <span className="ml-2 text-xs font-medium text-white bg-slate-900 rounded px-2 py-0.5">Best fidelity</span>
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Forward suspicious fundraising emails to{" "}
                  <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">submit@abjail.org</code>. 
                  This preserves headers, formatting, links, and images so we can prepare a ready-to-send report.
                </p>
                <p className="text-sm text-slate-600">
                  Recommended for email: most complete record and fastest reporting flow.
                </p>
              </div>

              {/* Screenshot upload (BEST FOR SMS) */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Screenshot upload <span className="ml-2 text-xs font-medium text-white bg-slate-900 rounded px-2 py-0.5">Best for SMS</span>
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Capture the text thread or email view and drag it into the uploader. We support PNG, JPG, HEIC, and single-page PDF up to 10MB.
                </p>
                <p className="text-sm text-slate-600">
                  Recommended for SMS/MMS and social screenshots. Preserves layout and images, but not email headers.
                </p>
              </div>

              {/* Paste text (FALLBACK) */}
              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste text <span className="ml-2 text-xs font-medium text-white bg-slate-500 rounded px-2 py-0.5">Fallback</span>
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Switch to the &ldquo;Paste text&rdquo; tab and paste the message content. Quickest option when forwarding or screenshots aren&apos;t possible.
                </p>
                <p className="text-sm text-slate-600">
                  Fast, but loses formatting, images, and email metadata.
                </p>
              </div>
            </div>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              What happens after you submit
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">1</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">We capture the content</h3>
                  <p className="text-slate-700">Screenshots go through Optical Character Recognition (OCR); forwarded emails keep their original formatting. The raw text and media are stored on the case.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">2</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">We extract additional context</h3>
                  <p className="text-slate-700">If an ActBlue landing page URL is detected, we automatically capture a screenshot for context. For forwarded emails, we also reduce personalized content (like your name) to protect your privacy.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">3</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">AI flags potential issues</h3>
                  <p className="text-slate-700">A lightweight check confirms it&apos;s fundraising; a deeper check highlights potential violations (e.g., fake matches, deceptive urgency).</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">4</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">A public case is created</h3>
                  <p className="text-slate-700">The case shows evidence (text/screenshot), flagged issues, and the landing-page snapshot for context.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">5</div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Report to ActBlue</h3>
                  <p className="text-slate-700">From the case page, click <em>Submit to ActBlue</em>. We prefill campaign name, message text or screenshot, landing page, and a case link. Replies from ActBlue are attached back to the case.</p>
                </div>
              </div>
            </div>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Submitting violations to ActBlue
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              We make reporting fast and consistent by pre-filling the details ActBlue needs to investigate—so you can submit in seconds and track responses in one place.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Email-Only Workflow (Easiest)</h3>
              <ol className="space-y-2 text-blue-900">
                <li className="flex gap-2"><span className="font-semibold">1.</span><span>Forward a suspicious email to <code className="bg-blue-100 px-2 py-0.5 rounded">submit@abjail.org</code>.</span></li>
                <li className="flex gap-2"><span className="font-semibold">2.</span><span>We process it and email you the case.</span></li>
                <li className="flex gap-2"><span className="font-semibold">3.</span><span>Click the <em>Submit to ActBlue</em> link to file your report.</span></li>
              </ol>
              <p className="text-sm text-blue-800 mt-3">
                No website visit required. The entire process happens via email.
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Website Workflow</h3>
              <ol className="space-y-2 text-slate-700">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Upload via website or forward an email</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>View the case on AB Jail</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Click &ldquo;Submit to ActBlue&rdquo; button on the case page</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">4.</span>
                  <span>Review the pre-filled report and submit</span>
                </li>
              </ol>
            </div>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              How we flag potential violations
            </h2>
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-800">
              <h3 className="font-semibold text-slate-900 mb-1">How detection works</h3>
              <p className="text-sm">
                We use AI to review each fundraising solicitation in context. First we extract the text and capture a snapshot of the donation page. The AI compares that evidence to ActBlue’s Account Use Policy (AUP) and our focused policy patterns, then returns potential flags with a short rationale.
              </p>
            </div>

            <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
              {VIOLATION_POLICIES.map((v) => (
                <details key={v.code} className="group">
                  <summary className="flex w-full items-center justify-between cursor-pointer list-none px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-1.5 bg-orange-400 rounded" />
                      <span className="font-semibold text-slate-900">{v.title}</span>
                    </div>
                    <svg className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-sm text-slate-700 mb-2">{v.policy}</p>
                    <a href={AUP_HELP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
                      View full ActBlue AUP
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3h7m0 0v7m0-7L10 14" />
                      </svg>
                    </a>
                  </div>
                </details>
              ))}
            </div>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Get involved
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              AB Jail is open source and community-driven. You can help improve the project by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mb-4">
              <li>Submitting cases to build our public database</li>
              <li>Reporting bugs or requesting features</li>
              <li>Contributing to AI training by evaluating classification accuracy</li>
              <li>Contributing code on GitHub</li>
            </ul>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/evaluation"
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                AI Training
              </Link>
              <Link
                href="/"
                className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                Submit a case
              </Link>
              <a
                href="https://github.com/ryanmio/ActBlue-Jail"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                Code on GitHub
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
        </section>

        <section className="mx-auto max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Questions?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              For more information about the project, see our{" "}
              <Link href="/about" className="text-blue-600 hover:underline">
                About page
              </Link>
              . For technical discussions or support, visit our{" "}
              <a
                href="https://github.com/ryanmio/ActBlue-Jail/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub Discussions
              </a>
              .
            </p>
        </section>

        <Footer />
      </div>
    </main>
  );
}

