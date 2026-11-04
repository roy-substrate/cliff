import type { Metadata } from "next";
import Link from "next/link";
import { Baloo_2, Caveat, Geist, Geist_Mono } from "next/font/google";
import { Pip } from "@/components/brand/Mascot";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["600", "700", "800"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Cliff: OAuth setup, minus the headache",
  description:
    "Find out what it takes to connect an app, get approved and go live. Guides for agent builders, with every claim checked against its source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${baloo.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 px-4 pt-4">
          <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-white/90 px-4 py-2 shadow-soft backdrop-blur-sm">
            <Link href="/" className="group flex items-center gap-2">
              <span className="transition group-hover:-rotate-6">
                <Pip size={34} />
              </span>
              <span className="font-display text-2xl font-extrabold tracking-tight">
                Cliff<span className="text-coral">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 text-[15px] font-semibold">
              <Link href="/apps" className="whitespace-nowrap rounded-full px-3 py-2 transition hover:bg-sky-soft sm:px-4">
                Directory
              </Link>
              <Link href="/about" className="hidden whitespace-nowrap rounded-full px-4 py-2 transition hover:bg-butter-soft sm:inline-flex">
                How it works
              </Link>
              <Link href="/#search" className="btn-ink ml-1 whitespace-nowrap !px-4 !py-2 !text-base">
                Check an app
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">{children}</main>
        <footer className="mx-auto mb-6 w-full max-w-6xl px-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-navy px-6 py-5 text-sm text-white/80">
            <span className="flex items-center gap-3">
              <Pip size={30} mood="sleepy" />
              Every claim links to its source. Tap the dots before you rely on one.
            </span>
            <span className="font-hand text-xl text-butter">built for agent builders, checked by agents</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
