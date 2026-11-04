import type { ReactNode } from "react";

/**
 * Tiny renderer for the markdown the writer actually uses in step details: paragraphs, bullet lines,
 * **bold**, `code` and bare links. No HTML passthrough, so guide text can never inject markup.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith("**")) out.push(<b key={k}>{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<code key={k} className="tech">{t.slice(1, -1)}</code>);
    else
      out.push(
        <a key={k} href={t} target="_blank" rel="noreferrer" className="break-all text-sky-deep underline">
          {t}
        </a>,
      );
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={k} className="my-1.5 list-disc space-y-1 pl-5">
        {list.map((l, j) => (
          <li key={j}>{inline(l, `${k}-${j}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  text.split(/\n/).forEach((raw, i) => {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flush(`l${i}`);
    if (line) blocks.push(<p key={`p${i}`} className="my-1.5">{inline(line, `p${i}`)}</p>);
  });
  flush("end");
  return <div className={className}>{blocks}</div>;
}
