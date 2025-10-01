"use client";

export default function Footer() {
  return (
    <footer className="mt-10">
      <div className="mx-auto max-w-6xl p-4 text-xs text-gray-600 text-center space-y-1">
        <p>Not affiliated with ActBlue. Classifications indicate potential policy issues and may be incorrect.</p>
        <p>
          This is an open-source project. The full code is available on{" "}
          <a className="underline hover:text-gray-800" href="https://github.com/ryanmio/ActBlue-Jail" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </div>
    </footer>
  );
}


