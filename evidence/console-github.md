# Console check: GitHub (2026-11-04)

Read-only check in a signed-in browser. Nothing was registered, created or submitted. The browser's policy blocked screenshots, so the evidence is the form text, recorded on the GitHub guide as `tested` attempt-log entries (`a_console_1`, `a_console_2`) by `scripts/console-github.mts`.

## What the forms ask for

**Register a new OAuth app** (`github.com/settings/applications/new`)
- Application name (required), Homepage URL (required), Application description (optional)
- Redirect URIs: "You may add up to 10 redirect URIs", with an optional "Allow wildcard matching"
- Enable Device Flow (checkbox)
- Expire user access tokens (checkbox, provides a `refresh_token`)

**Create GitHub App** (`github.com/settings/apps/new`)
- Same redirect URI rules (up to 10, optional wildcard), token expiry and device flow options
- Adds: request user authorization during installation, Setup URL, a webhook that is active by default, repository / organization / account / enterprise permissions, event subscriptions
- Install target: "Only on this account" or "Any account"

## What it changed in the guide

| Claim | Before | After | Why |
|---|---|---|---|
| Device flow must be enabled in app settings (c9, c36) | primary | tested | "Enable Device Flow" checkbox on the form |
| Expiring user tokens are an optional setting (c10) | primary | tested | "Expire user access tokens" checkbox |
| GitHub recommends GitHub Apps (c25) | primary | tested | The GitHub App form exposes fine-grained permission areas the OAuth form lacks |
| "The form requires an Authorization callback URL" (c6) | secondary | **unverified** | The live form has no such field. It has Redirect URIs, up to 10, with optional wildcard matching |

New tested facts: the 10-URI limit and wildcard option, the minimum required fields, and what a GitHub App adds over an OAuth app.

The guide's redirect-URI rule was rewritten to match the console. The outdated claim came from a third-party page, which is exactly the kind of source the evidence model ranks below the provider's own docs and a direct observation.
