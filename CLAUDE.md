# CLAUDE.md

Guidance for AI assistants and contributors working in this repository.

## Commits & pull requests

- **No tooling/automation attribution** in anything pushed — commit messages, PR titles or descriptions, code comments, release notes, or other artifacts. Do not add "Generated with …", `Co-Authored-By:` trailers for tools, or `claude.ai`/assistant session links.
- **Describe the change, not the process.** PR and commit descriptions should be user-facing — what changed and why it matters. Don't narrate internal back-and-forth, mistakes, or rejected alternatives.
- Keep messages concise and professional.

## Workflow

- `main` is protected — all changes land via pull request.
- Keep the full gate green before pushing: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`.
- Bump `package.json` and `src/version.ts` together — they must stay in sync (the server reports its version from `src/version.ts`).
