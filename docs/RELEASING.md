# Releasing & follow-ups

Maintenance notes for `@hypd-ai/openai-ads-mcp`, plus parked follow-ups to resume later.

## Parked follow-ups

- [ ] **Automated npm publishing via OIDC "Trusted Publishing"** (priority) — see below. Removes the manual `npm publish` step and the version/tag-drift risk we hit on the 0.1.1 release.
- [ ] **Add a `CHANGELOG.md`** ([Keep a Changelog](https://keepachangelog.com) format) with entries for 0.1.0 and 0.1.1.
- [ ] **v0.2.0 — write actions** (create/update + `activate`/`pause`/`archive`, file uploads, campaign country targeting), gated behind an explicit opt-in. See the README roadmap.

## Automated releases (OIDC Trusted Publishing) — to set up later

Goal: publishing to npm happens automatically when a GitHub Release is published — no terminal, no `NPM_TOKEN` secret, and the published version can't drift from the tag.

### 1. Add `.github/workflows/release.yml`

> A workflow file must be added via the GitHub **web editor** (or by someone whose token has the `workflows` permission) — the Claude Code app token can't push workflow files.

```yaml
name: Release
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write # required for npm OIDC trusted publishing + provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.x
          registry-url: https://registry.npmjs.org
      - run: npm install -g npm@latest # ensure a version with OIDC trusted-publishing support
      - run: npm ci
      - run: npm publish # publishConfig.access=public + the prepare build handle the rest; provenance is automatic via OIDC
```

### 2. Configure the Trusted Publisher on npm

On npmjs.com → the `@hypd-ai/openai-ads-mcp` package → **Settings → Trusted Publishing** → add a GitHub Actions publisher:

- Repository: `HYPD-AI/openai-ads-mcp`
- Workflow filename: `release.yml`
- Environment: leave blank (unless you add one).

### 3. How releasing then works

1. Bump the version in a PR (`package.json` **and** `src/version.ts` — keep them in sync) and merge to `main`.
2. Create a GitHub Release: tag `vX.Y.Z`, target `main`, write notes, **Publish**.
3. `release.yml` runs and publishes `@hypd-ai/openai-ads-mcp@X.Y.Z` with provenance. Done — no terminal.

## Manual release checklist (current process, for reference)

1. PR: bump `package.json` **and** `src/version.ts` to the new version (they must match — `src/version.ts` is what the server reports and sends in its User-Agent).
2. Merge the PR to `main`.
3. `git checkout main && git pull`
4. `npm publish` — run it **bare** (no trailing `# comment`). Enter your 2FA OTP. Success looks like `+ @hypd-ai/openai-ads-mcp@X.Y.Z`.
5. Create the GitHub Release: tag `vX.Y.Z` ("create new tag on publish"), target `main`, paste notes, Publish.
6. Verify: `npm view @hypd-ai/openai-ads-mcp version` and `npx -y @hypd-ai/openai-ads-mcp` (allow ~1–2 min for npm read propagation).

### Gotchas we hit (so we don't repeat them)

- **Don't push commits to a PR after it's merged** — they orphan onto a dead branch. Open a fresh PR for the bump.
- **Run `npm publish` bare in zsh** — a trailing `# ...` comment gets executed (zsh runs comments interactively), and the publish silently doesn't run.
- **Scoped packages need public access** — `publishConfig.access=public` (already set) or `npm publish --access public`.
- **npm read propagation lag** — a freshly published version can 404 on `npm view` / be invisible unauthenticated for a minute even though it's live.
- **Moving an existing git tag** needs repo-admin rights the app token doesn't have — to fix a mis-pointed tag, delete + recreate the release/tag in the UI.
