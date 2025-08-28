import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";


export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "800"],
});

const metadata: Metadata = {
  title: 'GRID',
  description: 'A Last.fm album grid generator',
  openGraph: {
    title: 'GRID',
    description: 'A Last.fm album grid generator',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-code">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetBrainsMono.variable} antialiased h-screen bg-neutral-950 text-neutral-300 overflow-hidden font-code`}
      >
        {children}
      </body>
    </html>
  );
}
