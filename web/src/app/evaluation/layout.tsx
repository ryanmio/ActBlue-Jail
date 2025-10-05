import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Training",
  description: "Help improve our AI by evaluating message violations - contribute to better automated detection",
  openGraph: {
    title: "AI Training",
    description: "Help improve our AI by evaluating message violations - contribute to better automated detection",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Training",
    description: "Help improve our AI by evaluating message violations - contribute to better automated detection",
  },
};

export default function EvaluationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
