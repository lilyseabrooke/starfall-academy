import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Jost, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";
import "@/styles/design-system.css";

const jost = Jost({
  variable: "--font-sans-google",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-google",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Starfall Academy",
  description: "Something is stirring in the ley lines",
  icons: {
    icon: "/favicon.png",
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
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${jost.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved light/dark preference before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Served from /public so the embedded static apps (compendium, map,
            chronicle, character map) share the exact same light palette. */}
        <link rel="stylesheet" href="/_theme/theme-light.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
