# Cliff

OAuth app setup and approval guides for people building agents that connect to other people's apps.

> Most OAuth guides tell you how hard a provider is. That is the wrong unit. Approval difficulty depends on the scopes your agent requests, who will connect, and how you distribute. Cliff asks for those three things, shows where the cliff is, and shows how sure we are of every claim.

Built for the Composio APM, Integrations take-home.

## What it does

- **Library**: ready-made guides for a set of apps chosen to span the difficulty range (instant to weeks plus cost).
- **Live generation**: type any app name or website. Agents investigate in real time, cite what they find, and say what they could not verify. The run streams so you can watch it work.
- **The cliff calculator**: pick what your agent must do, who will connect, and how many users. The tier you trip and the critical path to production re-render, with provider wait time drawn as wait time.
- **Build or borrow first**: every guide opens with whether you need your own OAuth app at all, using Composio's managed-auth directory (127 managed toolkits, 275 bring-your-own).
- **Evidence on every claim**: tested, primary, secondary, inferred or unverified, with the quote, URL and fetch date one click away.
- **Belief diff**: what the model believed before researching, compared with what the sources said.
- **Paperwork drafts**: scope justification, consent-screen copy, privacy clause and demo-video shot list, drafted from the guide's own sources.

## How it works

```
resolve ─┬─ Composio lookup
         └─ prior beliefs (model memory, before research)
discover (web search) → 3 extractors in parallel (web fetch, verbatim quotes)
                      ∥ probes (public endpoints, no login)
→ VERIFY (re-fetch every cited page, check each quote, find cross-source conflicts)
→ write (verified claims only) → publish
```

- Guides are structured data (`src/lib/schema.ts`). The page renders from it. Markdown and raw JSON are views.
- **Verification runs before writing.** In the first full run an extractor invented a "verbatim" quote (that Notion hides its Authorization URL until review). The verifier caught it, but the writer had already built the guide's headline gotcha on it. Now only claims that survive verification reach the writer, and a missing quote is a downgrade, not a footnote. See `evidence/spot-check-notion.md`.
- The writer may only cite claim ids it was given. Invented ids are stripped.
- The quote check is fair: markdown is stripped before comparing, partial matches count as "same fact, different wording", a quote found only on another site is downgraded from primary to secondary, and a conflict only demotes the weaker claim and only when the claims come from different sources.
- Difficulty is computed in code from the facts (`src/lib/difficulty.ts`), never chosen by the model, so scores are comparable across guides.
- The verifier re-fetches each cited page and checks the quote is really there (`src/pipeline/verify.ts`). A quote that is not found downgrades the claim.
- If a run cannot find enough sources it publishes an explicit fallback guide: difficulty is unknown, not zero, and nothing is presented as a finding.

## Setup

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev                     # http://localhost:3000
pnpm gen "Notion"            # run the pipeline from the CLI and save to data/guides
pnpm typecheck
```

`COMPOSIO_API_KEY` is optional. Without it a static copy of Composio's managed-auth directory is used.

## Key decisions

1. **Difficulty is a function of scopes, audience and distribution**, not of the provider's name.
2. **Evidence is a first-class field.** "Unverified" is a valid output and the product prefers it to a confident guess.
3. **Decision first.** The first question is whether you need your own app. For most Composio users the right first answer is no.
4. **Live runs are honest about their limits.** Public pages and unauthenticated probes only. No logging in to consoles live.
5. **Depth over breadth.** A handful of guides checked against real sources beats a hundred unchecked ones.

## Limitations

- Model-driven search uses the basic web search and fetch tools on purpose. The newer "dynamic filtering" variants run model-written code in a hidden sandbox; in testing the code printed nothing back, the model never saw the results, and it returned an empty source list while filling gaps from memory.
- The full guide schema exceeds the API's structured-output grammar limit, so the writer runs as three smaller calls (core facts, cliff model, steps). A JSON fallback with schema validation exists if a part is still too large.
- Live runs do not log in to provider consoles. Console-level evidence for library apps is recorded by hand or with a browser agent beforehand and attached as `tested` evidence.
- Many provider pages are rendered by JavaScript. Probes cannot always see login walls or error text, and say so.
- Wait times are ranges drawn from docs and developer reports, not promises.
- Library guides ship with the deployment from `data/guides`. Live-generated guides are stored in a private Vercel Blob store, because a serverless function's disk is per-instance and temporary (the first deploy wrote live guides to disk and their share links 404ed on the next request).
- The in-memory rate limiter resets on each serverless instance. Set the Upstash variables for a shared limit.
- Drafted documents are templates, not legal advice.

## Status

Verified so far: the schema, the critical-path scheduler, the quote verifier (a real quote is confirmed and a fabricated one is downgraded on a live page), the public probes, the streaming endpoint, the failure and fallback path, and the UI on a synthetic fixture. The model-driven stages (resolve through synthesize) have not yet been run against the live API, so no accuracy figures are reported yet.

## Accuracy check

To be filled in after the library is generated and a sample of claims is checked against the providers' own consoles and docs: claims checked, confirmed, corrected, and could not verify.
