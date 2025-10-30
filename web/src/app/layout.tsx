import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { env } from "@/lib/env";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "photoswipe/style.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: "AB Jail - Tracking Misleading Political Fundraising", template: "%s - AB Jail" },
  description:
    "Public database of political fundraising messages that may violate ActBlue's rules. AI analyzes submissions and messages from monitored accounts. Not affiliated with ActBlue.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AB Jail - Tracking Misleading Political Fundraising",
    description:
      "Public database of political fundraising messages that may violate ActBlue's rules. AI analyzes user submissions and auto-collected messages.",
    url: "/",
    siteName: "AB Jail",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AB Jail - Tracking Misleading Political Fundraising",
    description:
      "Public database of political fundraising messages that may violate ActBlue's rules. AI analyzes user submissions and auto-collected messages.",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <div className="flex-1">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
