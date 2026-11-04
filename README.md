# Cliff

**OAuth setup, minus the headache.** Find out what it takes to connect an app, get approved and go live.

- Live: https://cliff-omega.vercel.app
- Built for the Composio APM, Integrations take-home.

Most OAuth guides tell you how hard a provider is. That's the wrong unit. Approval difficulty depends on the scopes your agent requests, who will connect and how you distribute. Gmail is minutes for `gmail.send` to yourself and weeks plus a paid security assessment for `gmail.readonly` to the public. Cliff shows you which one you're signing up for, and how sure it is of every claim.

## What it does

- **Directory:** 11 guides chosen to span the range: instant (GitHub, Notion, Calendly, Typeform), days (Slack, Shopify, Pipedrive), weeks plus cost (Gmail restricted scopes), a bring-your-own-app case where Composio has no managed auth (Pipedrive), and an API-key-only service with no OAuth at all (OpenWeatherMap).
- **Live investigation:** type any app name or website. Pip, the mascot, investigates in real time: finds the developer docs, extracts facts with exact quotes, probes public endpoints, re-checks every quote, then writes the guide. Every message on screen is a real pipeline event.
- **Build or borrow first:** each guide opens with whether you need your own OAuth app at all. Composio's managed-OAuth directory (127 managed, 275 bring-your-own) is fetched live from docs.composio.dev and matched to the app, with a static copy as fallback.
- **The cliff calculator:** pick what your agent must do, who connects and how many users. The review tier and the critical path to production update, with provider-owned waits drawn as waits and unknown waits marked unknown.
- **Setup journey:** numbered stops, each tagged *you*, *Pip can do this* or *waiting on the provider*, expanding into details and sources.
- **Evidence on every claim:** a dot that opens the quote, URL and fetch date. Statuses are tested, from the docs, third-party, inferred and unverified.
- **How we know:** what the model believed before research next to what the sources said, plus every correction and everything that couldn't be verified.
- **Paperwork drafts:** scope justification, consent-screen copy, privacy clause and demo-video shot list, from the guide's own sources.
- **Share and re-verify:** every guide version has a permanent link and raw JSON. "Re-verify sources" re-fetches every cited page and publishes a new version, with no model calls.

## How it works

```
identify ─┬─ Composio managed-auth lookup
          └─ prior beliefs (model memory, recorded before research)
find docs (web search) → 3 extractors in parallel (web fetch, verbatim quotes)
                       ∥ probes (public endpoints, no login)
→ double-check (re-fetch every cited page, check each quote, cross-source conflicts)
→ write guide (verified facts only) → publish (immutable version)
```

Claude Sonnet 5.5 searches and extracts, Claude Opus 5.5 writes in three structured parts, and Claude Haiku 5.5 handles identification, conflicts and the belief diff. Difficulty is computed in code from facts (`src/lib/difficulty.ts`), never chosen by the model.

## Setup

```bash
pnpm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY
pnpm dev                        # http://localhost:3000
```

Everything also runs from the command line:

```bash
pnpm gen "Notion"               # investigate an app and save its guide
pnpm reverify [slug ...]        # re-check every cited page, no model calls
pnpm attach <slug> --action "..." --observed "..." --claims c3,c4 --step 2   # add console evidence
pnpm report                     # evidence summary across the directory
```

On Vercel, set `ANTHROPIC_API_KEY` and connect a private Vercel Blob store (`BLOB_READ_WRITE_TOKEN`) so live guides persist. `COMPOSIO_API_KEY` and the Upstash variables are optional.

## Key decisions

1. **Difficulty is a function of scopes, audience and distribution**, so the guide asks for those, not just the app name.
2. **Verify before writing.** Only facts that survive the quote re-check reach the writer.
3. **Evidence is a first-class field.** "Unverified" and "unknown" are valid outputs. The product prefers them to a confident guess.
4. **Decision first.** For many Composio users the right first answer is "you don't need your own app yet".
5. **Live runs never log in.** Console evidence is gathered separately and labelled as tested.
6. **Depth over breadth.** A handful of guides checked against real sources beats a hundred unchecked ones.
7. **A friendly face, serious content.** The playful design is for memorability. Every number and URL on screen still traces back to a source.

## What we checked, learned and corrected

Across 11 directory guides there are 462 claims: 44 tested, 394 quoted from the provider's own docs, 8 third-party, 14 inferred and 2 unverified. The quote re-check results:

| Re-checked quotes | Exact match | Same fact, different wording | Not found | Page unreadable |
|---|---|---|---|---|
| 414 | 384 | 17 | 13 (3%) | 7 |

Hand checks against the real sources:

- **Notion docs:** 12 of 12 sampled facts confirmed on Notion's own pages. See `evidence/spot-check-notion.md`.
- **GitHub console:** checked in a signed-in browser, read-only. 4 claims confirmed, 1 corrected, 3 new facts. See `evidence/console-github.md`.

What building it taught us:

- **Models invent "verbatim" quotes.** An extractor produced a convincing quote saying Notion hides its Authorization URL until review. Notion's docs say no such thing. The verifier caught it, but the writer had already built the headline gotcha on it. That's why verification now runs first.
- **The verifier needed its own debugging.** It wrongly failed real quotes because the fetch tool returns markdown. Google's docs randomly serve machine-translated pages unless you ask for English. Fixing both cut the not-found rate from 9% to the 3% above. What remains are real misses.
- **Stale facts lose to direct observation.** A third-party page said GitHub's form has one "Authorization callback URL". The live console shows up to 10 redirect URIs with optional wildcards.
- **Current facts beat the model's memory.** The Slack guide states the current Marketplace bar, 10 workspaces active in the last 28 days, not the older figure of 5 still quoted around the web.
- **The belief diff shows memory's errors.** The model assumed Notion and Calendly need review before strangers can connect. Their docs say they don't.

What we couldn't verify:

- **Review lengths:** Notion Marketplace, Dropbox production and Microsoft publisher verification lengths aren't documented on the pages read. The guides say "unknown" and don't guess.
- **Other consoles:** these need throwaway accounts. The GitHub check is the template, and `pnpm attach` records the rest.

## Limitations

- Live runs use public pages and unauthenticated probes only. Many consoles are JavaScript-rendered, so probes can't see login walls, and they say so.
- Wait times are ranges from docs and developer reports, not promises.
- Live investigations are capped at 5 per hour and 15 per day per visitor, and 20 per day overall (`DAILY_GEN_CAP`). Without the Upstash variables the limiter is in-memory and per server instance.
- Drafted paperwork is a template, not legal advice.
- A live run costs about $0.35 to $0.65 in API usage: Sonnet reads at most 3 pages per extractor, the writer's three calls share one cached input, and repeat visits are free because guides are cached.

See `DEMO.md` for a 90-second walkthrough.
