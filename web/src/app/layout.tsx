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
  title: "ActBlue Jail",
  description: "Public ledger for potential policy violations (MVP)",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ActBlue Jail",
    description: "Public ledger for potential policy violations (MVP)",
    url: "/",
    siteName: "ActBlue Jail",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActBlue Jail",
    description: "Public ledger for potential policy violations (MVP)",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
