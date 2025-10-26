import Link from "next/link";
import { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Learn how to use AB Jail to report potential ActBlue policy violations in political fundraising messages.",
};

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            How AB Jail works
          </h1>
          <p className="text-lg text-slate-700 leading-relaxed">
            A complete guide to using AB Jail to document and report potential ActBlue policy violations.
          </p>
        </div>

        {/* Main content */}
        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              What is AB Jail?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              AB Jail is an open-source, community-driven project that brings transparency to political fundraising. 
              We provide a public log of political SMS messages and emails, automatically extract their content, 
              and check them against ActBlue&apos;s Acceptable Use Policy (AUP).
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Our goal is to help hold political campaigns and organizations accountable by making deceptive 
              fundraising practices visible to the public.
            </p>
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
              <strong>Note:</strong> AB Jail is not affiliated with ActBlue. This is an independent transparency project.
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              How to submit a message
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              There are three ways to submit a political fundraising message:
            </p>

            <div className="space-y-6">
              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Screenshot upload
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Take a screenshot of the message on your phone or computer, then drag and drop it onto the upload area. 
                  We support PNG, JPG, HEIC, and single-page PDF files up to 10MB.
                </p>
                <p className="text-sm text-slate-600">
                  This is the most common method and provides the most complete record, including formatting and images.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste text
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Switch to the &ldquo;Paste text&rdquo; tab and paste the message content directly. This works well for plain text emails.
                </p>
                <p className="text-sm text-slate-600">
                  Faster than screenshots, but you&apos;ll lose formatting and context.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Forward email
                </h3>
                <p className="text-slate-700 leading-relaxed mb-3">
                  Forward suspicious fundraising emails directly to{" "}
                  <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                    submit@abjail.org
                  </code>
                  . We&apos;ll automatically process them.
                </p>
                <p className="text-sm text-slate-600">
                  The easiest method for email submissions, preserving all metadata and formatting.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              What happens after you submit
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Text extraction</h3>
                  <p className="text-slate-700 leading-relaxed">
                    We use OCR (Optical Character Recognition) via Tesseract to extract text from screenshots. 
                    For forwarded emails or pasted text, this step is skipped.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">AI classification</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Our AI analyzes the message against ActBlue&apos;s Acceptable Use Policy. It identifies potential 
                    violations like unverified matching programs, deceptive sender names, or false urgency claims.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Public case</h3>
                  <p className="text-slate-700 leading-relaxed">
                    A public case is created with the extracted text, identified violations, and (for screenshots) 
                    the original image. Anyone can view and reference this case.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Statistics tracking</h3>
                  <p className="text-slate-700 leading-relaxed">
                    Each case contributes to our public statistics, helping identify repeat offenders and 
                    trending violation types.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Privacy and data handling
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Important: All submissions are public
              </h3>
              <p className="text-amber-900 leading-relaxed">
                Everything you submit will be visible to the public. Do not submit content containing 
                private information you don&apos;t want shared.
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed mb-4">
              We automatically attempt to redact personally identifying information (PII) such as:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mb-4">
              <li>Phone numbers</li>
              <li>Email addresses (except sender addresses)</li>
              <li>Street addresses</li>
              <li>Social Security numbers</li>
              <li>Credit card numbers</li>
            </ul>
            <p className="text-slate-700 leading-relaxed">
              However, automated redaction is not perfect. Please review your submission and manually 
              redact any sensitive information before uploading.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Understanding violation codes
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Our AI classifies messages using a taxonomy based on ActBlue&apos;s Acceptable Use Policy. 
              Common violation types include:
            </p>
            <div className="space-y-3 mb-4">
              <div className="border-l-4 border-orange-400 pl-4 py-2">
                <div className="font-mono text-xs text-slate-500 mb-1">AB003</div>
                <div className="font-semibold text-slate-900">Unverified Matching Program</div>
                <div className="text-sm text-slate-700">Claims of donation matching without proper verification</div>
              </div>
              <div className="border-l-4 border-orange-400 pl-4 py-2">
                <div className="font-mono text-xs text-slate-500 mb-1">AB006</div>
                <div className="font-semibold text-slate-900">Impersonation/Deceptive Identity</div>
                <div className="text-sm text-slate-700">Messages that mislead about the true sender&apos;s identity</div>
              </div>
              <div className="border-l-4 border-orange-400 pl-4 py-2">
                <div className="font-mono text-xs text-slate-500 mb-1">AB008</div>
                <div className="font-semibold text-slate-900">False Urgency or Scarcity</div>
                <div className="text-sm text-slate-700">Artificial deadlines or pressure tactics without legitimate basis</div>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed">
              View any case detail page to see the full list of violation codes and policies.
            </p>
          </section>

          <section className="mb-12">
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
                href="/"
                className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
              >
                Submit a case
              </Link>
              <Link
                href="/evaluation"
                className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
              >
                AI Training
              </Link>
              <a
                href="https://github.com/ryanmio/ActBlue-Jail"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-slate-300 text-slate-900 rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
              >
                View on GitHub
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </section>

          <section>
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
        </div>

        <div className="mt-16">
          <Footer />
        </div>
      </div>
    </main>
  );
}

