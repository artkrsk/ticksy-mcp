# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that wraps the Ticksy support ticket API. It exposes read and write tools over stdio transport for AI agents to manage support tickets. Uses `@modelcontextprotocol/sdk` with Zod for tool parameter validation.

## Commands

```bash
pnpm build        # compile TypeScript to dist/
pnpm dev          # watch mode (tsc --watch)
pnpm start        # run compiled server (node dist/index.js)
pnpm exec tsc     # type-check without emitting
```

No test framework is configured.

## Architecture

Three source files, all in `src/`:

- **index.ts** — MCP server setup. Validates env vars, registers 7 read tools (list/get tickets, comments, counts) and 8 write tools (reply, note, close, reopen, star, read status, create customer), connects via `StdioServerTransport`. Uses a `run()` helper for uniform result/error formatting. Simple single-ID write tools are registered via a `SIMPLE_WRITE_TOOLS` loop.
- **ticksy.ts** — Ticksy REST API client. Builds base URL from `TICKSY_DOMAIN` and `TICKSY_API_KEY` env vars. Exports 11 async functions — `get()` helper for reads, `post()` helper for writes. Defines `Ticket` and `TicketComment` interfaces. Decodes HTML-encoded comment bodies into plain text via `utils.html()`.
- **utils.ts** — Single `html()` function that decodes HTML entities and strips tags from Ticksy's HTML-encoded comment strings.

## Key Details

- ESM project (`"type": "module"`) — all local imports use `.js` extensions.
- Ticksy API base: `https://api.ticksy.com/v1/{domain}/{key}/{endpoint}`.
- API responses use hyphenated keys (`open-tickets`, `ticket-data`, `ticket-comments`).
- Boolean-like fields from Ticksy come as `'0'` / `'1'` strings, not actual booleans.
- Requires `TICKSY_DOMAIN` and `TICKSY_API_KEY` environment variables (see `.env.example`).
