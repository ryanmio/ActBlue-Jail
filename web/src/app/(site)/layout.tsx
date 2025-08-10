import Link from "next/link";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
          <Link href="/" className="font-semibold">ActBlue Jail</Link>
          <nav className="text-sm space-x-4">
            <Link className="underline" href="/cases">Cases</Link>
            <Link className="underline" href="/about">About</Link>
          </nav>
        </div>
      </header>
      <div>{children}</div>
      <footer className="border-t bg-white mt-12">
        <div className="mx-auto max-w-6xl p-4 text-xs text-gray-500">
          Not affiliated with ActBlue. Allegations only; see evidence in each case.
        </div>
      </footer>
    </div>
  );
}
