import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forensic — Rugpull Autopsies on Solana",
  description:
    "Forensic reconstructs Solana rugpulls from on-chain data: timeline, extractors, deployer dossier, victim count. Powered by GoldRush.",
  openGraph: {
    title: "Forensic — Rugpull Autopsies",
    description: "Public post-mortems for every Solana rug.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
