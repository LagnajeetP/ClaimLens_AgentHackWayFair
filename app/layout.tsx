import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClaimLens — Multimodal voice agent for refund & warranty resolution",
  description:
    "Track winner at Beat The Clock Agent Hack. ClaimLens turns voice calls, damage photos, receipts, and order records into verified resolutions using Baseten, Subconscious, and VoiceRun.",
  keywords: [
    "ClaimLens",
    "AI agents",
    "customer service",
    "FinOps",
    "Baseten",
    "Subconscious",
    "Wayfair",
    "hackathon",
  ],
  openGraph: {
    title: "ClaimLens",
    description:
      "Multimodal voice agent for refund and warranty resolution — Beat The Clock Agent Hack track winner.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="flex min-h-full flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
