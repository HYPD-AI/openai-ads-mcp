# Contributing to openai-ads-mcp

Thanks for your interest in improving this project! This guide covers how to get set up and what we expect from contributions.

## Getting started

```bash
git clone https://github.com/hypd-ai/openai-ads-mcp.git
cd openai-ads-mcp
npm install
```

Useful scripts:

| Command             | Purpose                             |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Rebuild on change (`tsup --watch`). |
| `npm run build`     | Bundle to `dist/`.                  |
| `npm run typecheck` | Type-check with `tsc --noEmit`.     |
| `npm run lint`      | Lint with ESLint.                   |
| `npm run format`    | Format with Prettier.               |
| `npm test`          | Run the test suite (Vitest).        |

## Before opening a pull request

1. **Discuss big changes first.** For anything beyond a small fix, please open an issue so we can agree on the approach.
2. **Keep the build green.** Make sure all of these pass:
   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   npm run build
   ```
3. **Add tests** for new behavior. Network calls should be tested against a mocked `fetch` (see `test/client.test.ts`); tool registration can be exercised via the in-memory transport (see `test/server.test.ts`).
4. **Write clear commit messages** that explain the _why_, not just the _what_.

## Adding or changing tools

- One file per API resource lives in `src/tools/`. Each exports a `register*Tools(server, client)` function that is wired up in `src/tools/index.ts`.
- Reuse the shared zod shapes in `src/schemas.ts` (pagination, insights) and the `MICROS_NOTE` constant so descriptions stay consistent.
- Use `runTool(...)` from `src/tools/result.ts` so successes and API errors are formatted uniformly.
- Tag every tool with accurate [annotations](https://modelcontextprotocol.io/docs/concepts/tools) — in particular `readOnlyHint`.

## Write (mutating) actions

This project is **read-only by default**, with an opt-in paused-creation workflow. Discuss extensions to mutating actions first. Preserve the opt-in and account-verification boundaries, strict payload validation, and stable create keys; test network failures and partial success. Activation, updates and irreversible actions require separate review.

## Code style

- TypeScript, ESM, `strict` mode.
- Formatting and linting are enforced by Prettier and ESLint; run `npm run format` before committing.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
