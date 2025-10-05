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
  title: { default: "AB Jail", template: "%s - AB Jail" },
  description:
    "Upload a screenshot or paste text. AI flags potential ActBlue AUP violations and adds a public record. Not affiliated with ActBlue.",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AB Jail",
    description:
      "Upload a screenshot or paste text. AI flags potential ActBlue AUP violations and adds a public record.",
    url: "/",
    siteName: "AB Jail",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AB Jail",
    description:
      "Upload a screenshot or paste text. AI flags potential ActBlue AUP violations and adds a public record.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <div className="flex-1">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
