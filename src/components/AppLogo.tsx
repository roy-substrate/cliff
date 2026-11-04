"use client";

import { useState } from "react";

/** The provider's own favicon in a white sticker circle, falling back to a monogram. */
export function AppLogo({ name, homepage, size = 48 }: { name: string; homepage?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  let host = "";
  try {
    host = homepage ? new URL(homepage.startsWith("http") ? homepage : `https://${homepage}`).hostname.replace(/^www\./, "") : "";
  } catch {}
  const src = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : "";
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-white shadow-soft" style={{ width: size, height: size }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size * 0.56} height={size * 0.56} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="rounded-md" />
      ) : (
        <span className="font-display font-extrabold text-ink" style={{ fontSize: size * 0.42 }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
