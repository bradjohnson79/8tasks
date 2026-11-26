import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const DESCRIPTION =
  "Discover legitimate opportunities to earn extra money through simple tasks, testing, research and more. Always free.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "8Tasks: Small Missions. Real Money.", template: "%s · 8Tasks" },
  description: DESCRIPTION,
  applicationName: "8Tasks",
  openGraph: {
    type: "website",
    siteName: "8Tasks",
    url: SITE_URL,
    title: "8Tasks: Small Missions. Real Money.",
    description: DESCRIPTION,
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "8Tasks: Small Missions. Real Money.",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#131B2B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
