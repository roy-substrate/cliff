import Link from "next/link";
import { Pip } from "@/components/brand/Mascot";
import { Annotation } from "@/components/brand/Doodles";

export default function NotFound() {
  return (
    <div className="bg-sky-wash flex flex-col items-center rounded-[44px] px-6 py-16 text-center">
      <Annotation className="-rotate-2">this page came unplugged</Annotation>
      <Pip mood="sleepy" size={150} />
      <h1 className="font-display mt-2 text-5xl font-extrabold tracking-tight">We couldn&apos;t find that</h1>
      <p className="mt-2 max-w-md text-lg text-ink/70">The guide may have been moved, or the link is from an older version. Try the directory or search for the app.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/#search" className="btn-ink">
          Search an app →
        </Link>
        <Link href="/apps" className="btn-ghost">
          Open the directory
        </Link>
      </div>
    </div>
  );
}
