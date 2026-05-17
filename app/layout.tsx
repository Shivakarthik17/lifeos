import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS — Build the best version of yourself",
  description:
    "LifeOS is a personal life management system for disciplined growth across Finance, Fitness, Mind, Business, Daily Discipline, and People.",
  themeColor: "#070B1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
