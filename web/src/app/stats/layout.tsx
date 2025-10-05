import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparency Reporting",
  description: "Public statistics on captures, violations, and reports - transparency in action",
  openGraph: {
    title: "Transparency Reporting",
    description: "Public statistics on captures, violations, and reports - transparency in action",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transparency Reporting",
    description: "Public statistics on captures, violations, and reports - transparency in action",
  },
};

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
