import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "8Tasks: Small Missions. Real Money.", template: "%s · 8Tasks" },
  description:
    "Discover legitimate opportunities to earn extra money through simple tasks, testing, research and more.",
  applicationName: "8Tasks",
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
