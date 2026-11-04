import { STATUS_STYLE } from "@/lib/status";

export const metadata = { title: "How Cliff works" };

const STAGES = [
  ["Scout", "Resolves the app, checks whether Composio already manages its OAuth, and records what the model believes before any research."],
  ["Librarian", "Searches for the provider's own developer docs, review policy and limits."],
  ["Extractors", "Three agents in parallel read the pages and return claims, each with a verbatim quote."],
  ["Prober", "Calls public endpoints without logging in: discovery documents, the authorize endpoint, the developer portal."],
  ["Writer", "Writes the guide from claims only. It may not state a number, URL or scope that no claim supports."],
  ["Verifier", "Re-fetches every cited page, checks that each quote is really there, flags old or deprecated sources, and finds claims that conflict."],
] as const;

export default function About() {
  return (
    <div className="prose-step max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">How Cliff works</h1>
      <section>
        <h2 className="text-lg font-semibold">The idea</h2>
        <p>
          Approval difficulty is not a property of the provider. It depends on the scopes your agent requests, who will connect, and how you distribute. Reading mail from your own
          account is minutes of work. Reading mail for the public can mean weeks of review and a paid security assessment. Cliff makes that visible instead of averaging it away.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">The agents</h2>
        <ol className="space-y-2">
          {STAGES.map(([n, d]) => (
            <li key={n}>
              <b>{n}.</b> {d}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-lg font-semibold">How to read the dots</h2>
        <ul className="space-y-1">
          {(Object.keys(STATUS_STYLE) as (keyof typeof STATUS_STYLE)[]).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <i className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_STYLE[k].dot}`} />
              <b>{STATUS_STYLE[k].label}:</b> {STATUS_STYLE[k].text}
            </li>
          ))}
        </ul>
        <p>A ringed dot means the source looks old or marks the feature as deprecated. Click any dot to see the quote, the URL and when it was fetched.</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">What this cannot do</h2>
        <ul className="list-disc pl-5">
          <li>It does not log in to provider consoles during a live run. Live guides use public pages and unauthenticated probes only.</li>
          <li>Many provider pages are rendered by JavaScript, so probes cannot always read login walls or error text. Those are reported as not checkable, never as passed.</li>
          <li>Wait times come from provider docs and developer reports. They are ranges, not promises.</li>
          <li>Drafted documents are templates, not legal advice.</li>
        </ul>
      </section>
    </div>
  );
}
