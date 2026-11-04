import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cliff: find the verification cliff before you walk off it",
  description:
    "OAuth app setup and approval guides for agent builders. Difficulty depends on your scopes, your users and how you distribute, not on the provider's logo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              Cliff<span className="text-accent">.</span>
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/apps" className="hover:text-fg">
                Library
              </Link>
              <Link href="/about" className="hover:text-fg">
                How it works
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Guides are generated from cited sources and re-verified. Check the evidence chips before you rely on a claim.
        </footer>
      </body>
    </html>
  );
}
