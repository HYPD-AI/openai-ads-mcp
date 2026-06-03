# openai-ads-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the **OpenAI Ads (Advertiser) API**. It lets MCP-compatible clients — Claude Desktop, Cursor, VS Code, and others — read your OpenAI Ads campaigns, ad groups, ads, and performance insights through natural language.

[![npm](https://img.shields.io/npm/v/@hypd-ai/openai-ads-mcp)](https://www.npmjs.com/package/@hypd-ai/openai-ads-mcp)
[![CI](https://github.com/HYPD-AI/openai-ads-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/HYPD-AI/openai-ads-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-43853d.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-server-blue.svg)](https://modelcontextprotocol.io)

> **Read-only.** This first release only **reads** data — it never creates, edits, or pauses anything and never spends budget. Write actions are on the [roadmap](#roadmap).
>
> **Unofficial.** This is a community project and is **not affiliated with or endorsed by OpenAI**. See the [disclaimer](#disclaimer).

---

## Overview

The [OpenAI Ads API](https://developers.openai.com/ads/api-quickstart) exposes an advertiser's account, campaigns, ad groups, ads, and reporting. This server wraps the read endpoints of that API as MCP tools so an AI assistant can answer questions like:

- _"Is my OpenAI Ads API key working? What account is it tied to?"_
- _"List my active campaigns and their budgets."_
- _"Show spend, clicks, and CTR for campaign `cmp_123` over the last 30 days, by day."_
- _"Which ads in ad group `adg_456` are still pending review?"_

## Features

- **11 read-only tools** covering the account, campaigns, ad groups, ads, and insights at every level.
- **Faithful responses** — the API's JSON is returned as-is, so nothing is lost in translation.
- **Clear errors** — HTTP status and the API error body are surfaced to the model instead of being swallowed.
- **Micros-aware** — every tool description explains the [micros convention](#a-note-on-micros) so the assistant can present human-readable currency.
- **Cursor pagination** passthrough (`limit`, `order`, `after`, `before`).
- **Zero-install** via `npx` — `npx -y @hypd-ai/openai-ads-mcp`, no clone or build.

## Tools

| Tool                    | What it does                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `get_ad_account`        | Fetch the ad account for the configured key. Great as a connectivity check. |
| `list_campaigns`        | List campaigns (objective, budget, country targeting).                      |
| `get_campaign`          | Fetch a single campaign by ID.                                              |
| `list_ad_groups`        | List ad groups, optionally filtered by campaign.                            |
| `get_ad_group`          | Fetch a single ad group by ID (bidding config, context hints).              |
| `list_ads`              | List ads, optionally filtered by ad group.                                  |
| `get_ad`                | Fetch a single ad by ID (creative + review status).                         |
| `get_account_insights`  | Performance insights for the whole account.                                 |
| `get_campaign_insights` | Performance insights for one campaign.                                      |
| `get_ad_group_insights` | Performance insights for one ad group.                                      |
| `get_ad_insights`       | Performance insights for one ad.                                            |

Insights tools accept `since`/`until` (YYYY-MM-DD) for the reporting window, plus `time_granularity` (`daily`/`none`), `aggregation_level`, `fields`, `sort`, `filters`, `limit` (1–10000), and `after`/`before` cursors.

## Prerequisites

- **Node.js 20 or newer.**
- **An OpenAI Ads API key.** Create an Ads account at [ads.openai.com](https://ads.openai.com) (currently **US-only**), then issue a key from **Settings** → [ads.openai.com/settings](https://ads.openai.com/settings). See the [quickstart](https://developers.openai.com/ads/api-quickstart) and [authentication](https://developers.openai.com/ads/api-reference/authentication) docs. Each key is **scoped to a single ad account**.

## Installation & configuration

MCP clients launch the server as a subprocess and pass your API key via an environment variable.

> **Published on npm** as [`@hypd-ai/openai-ads-mcp`](https://www.npmjs.com/package/@hypd-ai/openai-ads-mcp) — `npx` fetches it for you, so there's nothing to clone or build. To run the latest **unreleased** `main` instead, replace `@hypd-ai/openai-ads-mcp` with `github:HYPD-AI/openai-ads-mcp` (its first launch builds from source — see [Running from source](#running-from-source)).

Add the snippet for your client below.

### Claude Desktop

Edit your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openai-ads": {
      "command": "npx",
      "args": ["-y", "@hypd-ai/openai-ads-mcp"],
      "env": {
        "OPENAI_ADS_API_KEY": "your-openai-ads-api-key"
      }
    }
  }
}
```

Restart Claude Desktop, then ask: _"Use the openai-ads tools to look up my ad account."_

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project):

```json
{
  "mcpServers": {
    "openai-ads": {
      "command": "npx",
      "args": ["-y", "@hypd-ai/openai-ads-mcp"],
      "env": {
        "OPENAI_ADS_API_KEY": "your-openai-ads-api-key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`. VS Code can prompt for the key and store it as a secret via `inputs`:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "openai_ads_api_key",
      "description": "OpenAI Ads API key",
      "password": true
    }
  ],
  "servers": {
    "openai-ads": {
      "command": "npx",
      "args": ["-y", "@hypd-ai/openai-ads-mcp"],
      "env": {
        "OPENAI_ADS_API_KEY": "${input:openai_ads_api_key}"
      }
    }
  }
}
```

### Other MCP clients

Any client that speaks MCP over **stdio** works. Run `npx -y @hypd-ai/openai-ads-mcp` (or `node /path/to/dist/index.js`) with `OPENAI_ADS_API_KEY` set in the environment.

## Configuration

| Variable              | Required | Default                         | Description                                                |
| --------------------- | -------- | ------------------------------- | ---------------------------------------------------------- |
| `OPENAI_ADS_API_KEY`  | Yes      | —                               | Your OpenAI Ads API key, sent as a Bearer token.           |
| `OPENAI_ADS_BASE_URL` | No       | `https://api.ads.openai.com/v1` | Override the API base URL (useful for testing or a proxy). |

See [`.env.example`](./.env.example).

## A note on "micros"

Fields whose names end in **`_micros`** — for example a campaign's `lifetime_spend_limit_micros` or an ad group's `max_bid_micros` — are expressed in micros:

```
1,000,000 micros = 1 unit of the account's currency   (e.g. $1.00 = 1,000,000 micros)
```

So a `lifetime_spend_limit_micros` of `25000000` is **$25.00**. Divide a `_micros` value by 1,000,000 to display a human amount, or multiply by 1,000,000 to convert the other way.

> **Insights metrics are not micros.** Reporting values like `spend`, `cpc`, and `cpm` are already in the account's currency as decimals (e.g. `spend: 42.75` means $42.75).

## Read-only by design

This release registers **only read (`GET`) tools** — and each one is annotated with the MCP `readOnlyHint`, so well-behaved clients know it cannot mutate state. There is no tool here that can create, edit, pause, or delete anything, and nothing that can spend budget. Write actions will arrive as a deliberate, separately reviewed step (see [Roadmap](#roadmap)).

## Running from source

```bash
git clone https://github.com/hypd-ai/openai-ads-mcp.git
cd openai-ads-mcp
npm install
npm run build
```

Then point your MCP client at the built entry file:

```json
{
  "mcpServers": {
    "openai-ads": {
      "command": "node",
      "args": ["/absolute/path/to/openai-ads-mcp/dist/index.js"],
      "env": {
        "OPENAI_ADS_API_KEY": "your-openai-ads-api-key"
      }
    }
  }
}
```

### Try it with the MCP Inspector

```bash
OPENAI_ADS_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

## Development

```bash
npm install          # install dependencies
npm run dev          # rebuild on change (tsup --watch)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm test             # vitest
npm run build        # bundle to dist/
```

Project layout:

```
src/
  index.ts        # bin entry: load config, build server, connect stdio
  server.ts       # buildServer(): McpServer + register all tools
  client.ts       # OpenAIAdsClient: auth, URL building, errors
  config.ts       # environment parsing & validation
  schemas.ts      # shared zod shapes (pagination, insights) + micros note
  tools/          # one file per resource (account, campaigns, ad-groups, ads, insights)
test/             # vitest specs (config, client, in-memory server)
```

## How tools map to the API

All endpoints are under the base URL (default `https://api.ads.openai.com/v1`).

| Tool                    | Method | Endpoint                            |
| ----------------------- | ------ | ----------------------------------- |
| `get_ad_account`        | `GET`  | `/ad_account`                       |
| `list_campaigns`        | `GET`  | `/campaigns`                        |
| `get_campaign`          | `GET`  | `/campaigns/{campaign_id}`          |
| `list_ad_groups`        | `GET`  | `/ad_groups`                        |
| `get_ad_group`          | `GET`  | `/ad_groups/{ad_group_id}`          |
| `list_ads`              | `GET`  | `/ads`                              |
| `get_ad`                | `GET`  | `/ads/{ad_id}`                      |
| `get_account_insights`  | `GET`  | `/ad_account/insights`              |
| `get_campaign_insights` | `GET`  | `/campaigns/{campaign_id}/insights` |
| `get_ad_group_insights` | `GET`  | `/ad_groups/{ad_group_id}/insights` |
| `get_ad_insights`       | `GET`  | `/ads/{ad_id}/insights`             |

## Roadmap

- ✍️ **Write actions** — create & update (via `POST`) campaigns, ad groups, and ads, plus the dedicated state transitions (`POST .../activate`, `.../pause`, `.../archive`). The HTTP client already supports `POST`; these will be gated behind an explicit opt-in, since they change delivery and spend.
- 🖼️ **Creative uploads** — `POST /upload` (JSON `image_url` or `multipart/form-data`) to attach images to ad creatives.
- 🌍 **Campaign targeting** — country include/exclude (`targeting.locations.countries`).
- 📈 **Conversions API** support.
- 🌐 **Remote/HTTP transport** for hosted deployments.
- 📦 **Published npm release** so `npx -y openai-ads-mcp` works out of the box.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md). In short: open an issue to discuss substantial changes, keep `npm run lint && npm run typecheck && npm test` green, and add tests for new behavior.

## Disclaimer

This is an **unofficial**, community-built project. It is **not affiliated with, endorsed by, or sponsored by OpenAI**. "OpenAI" and related names and logos are trademarks of OpenAI. Your use of the OpenAI Ads API through this tool is subject to OpenAI's terms and policies. The tool is provided "as is", without warranty of any kind — see the [license](./LICENSE).

## License

[MIT](./LICENSE) © HYPD AI
