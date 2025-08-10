export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">About</h1>
      <p className="text-sm text-gray-700">
        This site is not affiliated with ActBlue. Entries are user-submitted allegations of potential policy violations. We show evidence snippets and model confidence, and encourage manual review.
      </p>
      <p className="text-sm text-gray-700">
        Privacy: recipient identifiers are redacted by default. Uploaders assert they have the right to share the content.
      </p>
    </main>
  );
}

