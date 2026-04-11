import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import ChatWidget from "@/components/chat-widget";
import PushManager from "@/components/push-manager";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CardWatch - eBay Sports Card Scanner",
  description:
    "Monitor eBay for newly listed raw sports cards. Get email alerts when cards you want are listed.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-[family-name:var(--font-sans)]">
        <SessionProvider>
          {children}
          <PushManager />
        </SessionProvider>
        <ChatWidget />
      </body>
    </html>
  );
}
