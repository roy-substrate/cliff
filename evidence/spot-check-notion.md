# Spot-check: Notion guide against Notion's own pages

Checked 2026-11-04 by reading the live pages directly, independent of the pipeline's own quote check.
Pages: `developers.notion.com/guides/get-started/authorization`, `/reference/request-limits`, `/reference/create-a-token`, `/reference/refresh-a-token`.

## Confirmed against the source (12)

| Fact in the guide | Where it is stated |
|---|---|
| Rate limit is 600 requests per minute on Business and Enterprise | request-limits |
| Rate limit is 180 requests per minute on all other plans | request-limits |
| A separate per-workspace limit is shared across all connections | request-limits |
| `public_api_request_blocked`: access restricted, "retrying won't help", contact support | request-limits |
| Authorize URL uses `owner=user` and `response_type=code` | authorization |
| Installation scope is Any workspace or selected workspaces, and "can't be changed after creation" | authorization |
| Cancel at the consent step redirects with an `error=access_denied` query parameter | authorization |
| Page picker only shows pages the user has full access to | authorization |
| Token exchange authenticates with a Basic header (base64 of client id and secret) | create-a-token |
| Token response includes access and refresh tokens | create-a-token |
| Refreshing returns a new access token and a new refresh token (rotation) | refresh-a-token |
| Public connections can be created and used without Marketplace listing; listing needs a security review | public-connections page |

## Caught by the pipeline (not in the final guide)

An extractor produced the "verbatim" quote *"The Authorization URL field populates after a public connection is submitted for review"*. Notion's pages say the URL "is provided in the developer portal" and never mention review. The quote check scored it 0%.

In the first full run the writer had already built the guide's headline gotcha on it, because synthesis ran before verification. The pipeline now verifies first and the writer only sees claims that passed. This was found by reading real output, not by the verifier alone, and it changed the architecture.

## Corrected in the tooling during this check

- Quotes from the fetch tool are markdown; re-fetched pages are plain text. Identical sentences failed to match until markup was stripped.
- A quote found only on a third-party page is now downgraded from primary to secondary.
- A "conflict" between claims read from the same page (per-connection vs per-workspace rate limit) is not a dispute. Conflicts now count only across sources, and only the weaker claim is demoted.

## Could not verify

- How long Notion's security review for Marketplace listing takes. Not documented on the pages read. The guide marks it "duration unknown" rather than guessing.
- Whether any capability (read, update, insert content) triggers extra review. Pages do not say.
- Pages are rendered by JavaScript for some sections, so live probes of the console could not see form fields. A real console attempt is still needed for field-level evidence.
