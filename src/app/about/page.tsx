import Link from "next/link";
import { STATUS_STYLE } from "@/lib/status";
import { Pip, type PipMood } from "@/components/brand/Mascot";
import { Annotation, HandArrow } from "@/components/brand/Doodles";

export const metadata = { title: "How Cliff works" };

const STAGES: { name: string; text: string; mood: PipMood; tone: string }[] = [
  { name: "Identify", text: "Works out which app you mean, checks whether Composio already manages its OAuth, and writes down what the model believes before any research.", mood: "happy", tone: "bg-sky-soft" },
  { name: "Find docs", text: "Searches for the provider's own developer docs, review policy and limits.", mood: "search", tone: "bg-mint-soft" },
  { name: "Read & quote", text: "Three agents read the pages in parallel and return facts, each with an exact quote from its source.", mood: "search", tone: "bg-butter-soft" },
  { name: "Probe", text: "Calls public endpoints without logging in: discovery documents, the authorize endpoint, the developer portal.", mood: "think", tone: "bg-peach-soft" },
  { name: "Double-check", text: "Re-fetches every cited page and checks each quote is really there. Facts that fail are downgraded before anything is written.", mood: "think", tone: "bg-lilac-soft" },
  { name: "Write guide", text: "Writes the guide from verified facts only. It may not state a number, URL or scope that no fact supports.", mood: "celebrate", tone: "bg-mint-soft" },
];

export default function About() {
  return (
    <div className="space-y-10">
      <section className="bg-sky-wash relative overflow-hidden rounded-[44px] px-6 py-12 sm:px-12">
        <span className="absolute -bottom-3 right-8 hidden md:block">
          <Pip mood="happy" size={170} />
        </span>
        <span className="absolute right-[210px] top-14 hidden items-center gap-1 lg:flex">
          <Annotation className="-rotate-2">that&apos;s Pip, a little plug</Annotation>
          <HandArrow variant="down" width={48} />
        </span>
        <p className="font-hand text-2xl text-ink/60">how Cliff works</p>
        <h1 className="font-display max-w-2xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">The wrong question is &ldquo;how hard is this provider?&rdquo;</h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/75">
          Approval depends on the scopes you request, who will connect and how you distribute. Reading mail from your own account takes minutes. Reading mail for the public can mean weeks
          of review and a paid security assessment. Cliff shows you which one you&apos;re signing up for, before you start.
        </p>
      </section>

      <section>
        <h2 className="font-display text-4xl font-extrabold tracking-tight">What Pip does when you search</h2>
        <p className="mt-1 text-muted">Six real stages. The live view shows each one as it happens, and nothing in it is simulated.</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s, i) => (
            <li key={s.name} className={`relative overflow-hidden rounded-[30px] ${s.tone} p-6`}>
              <span className="absolute -right-1 -top-1">
                <Pip mood={s.mood} size={68} />
              </span>
              <span className="font-display text-sm font-bold text-ink/50">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-2xl font-extrabold">{s.name}</h3>
              <p className="mt-2 max-w-[90%] text-[15px] text-ink/75">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] bg-white p-7 shadow-soft">
          <h2 className="font-display text-3xl font-extrabold">How to read the dots</h2>
          <ul className="mt-4 space-y-3">
            {(Object.keys(STATUS_STYLE) as (keyof typeof STATUS_STYLE)[]).map((k) => (
              <li key={k} className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-3">
                <i className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-white shadow ${STATUS_STYLE[k].dot}`} />
                <span>
                  <b className="font-display text-lg">{STATUS_STYLE[k].label}</b> <span className="text-ink/70">{STATUS_STYLE[k].text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">A gold ring means the source looks old or calls the feature deprecated. Tap any dot to see the quote, the URL and when it was fetched.</p>
        </div>
        <div className="rounded-[34px] bg-coral-soft p-7">
          <h2 className="font-display text-3xl font-extrabold">What Cliff can&apos;t do (yet)</h2>
          <ul className="mt-4 space-y-2 text-[15px]">
            <li className="rounded-2xl bg-white/80 px-4 py-3">Live runs never log in to provider consoles. They use public pages and unauthenticated probes. Console evidence is recorded separately and marked as tested.</li>
            <li className="rounded-2xl bg-white/80 px-4 py-3">Many provider pages are rendered by JavaScript, so probes can&apos;t always see login walls or error text. They say so, and never count it as a pass.</li>
            <li className="rounded-2xl bg-white/80 px-4 py-3">Wait times come from provider docs and developer reports. They&apos;re ranges, not promises.</li>
            <li className="rounded-2xl bg-white/80 px-4 py-3">Drafted paperwork is a template, not legal advice.</li>
          </ul>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 rounded-[36px] bg-navy px-6 py-10 text-center text-white">
        <Pip mood="search" size={90} />
        <h2 className="font-display text-4xl font-extrabold">Got an app in mind?</h2>
        <Link href="/#search" className="btn-ink !bg-white !text-ink">
          Let&apos;s figure it out →
        </Link>
      </section>
    </div>
  );
}
