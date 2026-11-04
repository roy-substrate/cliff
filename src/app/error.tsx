"use client";

import Link from "next/link";
import { Pip } from "@/components/brand/Mascot";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[44px] bg-coral-soft px-6 py-16 text-center">
      <Pip mood="oops" size={150} />
      <h1 className="font-display mt-2 text-5xl font-extrabold tracking-tight">Something tripped Pip up</h1>
      <p className="mt-2 max-w-md text-lg text-ink/70">This page hit an error. Trying again usually works. If it doesn&apos;t, the directory still has every guide.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">ref {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="btn-ink">
          Try again
        </button>
        <Link href="/apps" className="btn-ghost">
          Open the directory
        </Link>
      </div>
    </div>
  );
}
