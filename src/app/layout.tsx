import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CardWatch - eBay Sports Card Scanner",
  description:
    "Monitor eBay for newly listed raw sports cards. Get email alerts when cards you want are listed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-[family-name:var(--font-sans)]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
