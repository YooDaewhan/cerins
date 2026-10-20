import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/src/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  // Makes hreflang/og URLs absolute; Google ignores relative hreflang.
  metadataBase: new URL(SITE_URL),
  // ponytail: no og:title — scrapers fall back to each page's <title>.
  openGraph: { siteName: "CERINS", type: "website", images: "/cerins_logo.png" },
  title: "CERINS — Global Certification & Inspection Partner",
  description:
    "CERINS provides professional certification, inspection, documentation, project management and customs brokerage services for companies entering global markets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
