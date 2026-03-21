# @artemsemkin/ticksy-mcp

MCP server for the [Ticksy](https://ticksy.com) support ticket API. Gives AI agents full read and write access to your support tickets.

## Tools

### Read

- `list_open_tickets` — open tickets with embedded comments; optionally filter to those awaiting a reply
- `list_closed_tickets` — most recently closed tickets
- `get_ticket` — single ticket with full comment thread
- `get_ticket_comments` — comments for a ticket without full ticket data
- `list_my_tickets` — open tickets assigned to the authenticated agent
- `count_responses_needed` — number of tickets awaiting a support response
- `count_my_responses` — same, scoped to the authenticated agent

### Write

- `reply_to_ticket` — post a public reply (or staff-only with `private: true`)
- `add_ticket_note` — post an internal note visible only to staff
- `close_ticket` / `reopen_ticket` — change ticket status
- `mark_ticket_read` / `mark_ticket_unread` — toggle read state
- `star_ticket` / `unstar_ticket` — toggle star
- `create_customer` — create a new customer account

## Setup

You need two environment variables:

- **`TICKSY_DOMAIN`** — your subdomain (e.g. `acme` for `acme.ticksy.com`)
- **`TICKSY_API_KEY`** — from your [Ticksy profile page](https://ticksy.com)

<details>
<summary>Claude Desktop</summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ticksy": {
      "command": "npx",
      "args": ["-y", "@artemsemkin/ticksy-mcp"],
      "env": {
        "TICKSY_DOMAIN": "your-domain",
        "TICKSY_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

<details>
<summary>Claude Code</summary>

```bash
claude mcp add ticksy \
  -e TICKSY_DOMAIN=your-domain \
  -e TICKSY_API_KEY=your-api-key \
  -- npx -y @artemsemkin/ticksy-mcp
```
</details>

<details>
<summary>VS Code / Cursor</summary>

Add to `.vscode/mcp.json` (VS Code) or `.cursor/mcp.json` (Cursor) in your project:

```json
{
  "servers": {
    "ticksy": {
      "command": "npx",
      "args": ["-y", "@artemsemkin/ticksy-mcp"],
      "env": {
        "TICKSY_DOMAIN": "your-domain",
        "TICKSY_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

## Build from source

```bash
git clone https://github.com/artkrsk/@artemsemkin/ticksy-mcp.git
cd @artemsemkin/ticksy-mcp
pnpm install
pnpm build
```
