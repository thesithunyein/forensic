import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forensic — Rugpull Autopsies on EVM",
  description:
    "Forensic reconstructs EVM rugpulls from on-chain data: timeline, extractors, deployer dossier, victim count. Powered by GoldRush.",
  openGraph: {
    title: "Forensic — Rugpull Autopsies",
    description: "Public post-mortems for every EVM rug.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
