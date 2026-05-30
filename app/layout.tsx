import type { Metadata, Viewport } from "next";
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
  applicationName: "LifeOS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "LifeOS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.svg" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
