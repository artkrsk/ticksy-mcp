#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  listOpenTickets,
  listClosedTickets,
  getTicket,
  getTicketComments,
  listMyTickets,
  countResponsesNeeded,
  countMyResponsesNeeded,
  closeTicket,
  openTicket,
  markAsRead,
  markAsUnread,
  starTicket,
  unstarTicket,
  createCustomer,
  replyToTicket,
  addTicketNote,
} from './ticksy.js'

// ── Validate env ───────────────────────────────────────────────

if (!process.env.TICKSY_DOMAIN || !process.env.TICKSY_API_KEY) {
  console.error('Missing required env vars: TICKSY_DOMAIN, TICKSY_API_KEY')
  process.exit(1)
}

// ── Server ─────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'ticksy', version: '1.0.0' },
  { capabilities: { logging: {} } },
)

// ── Helpers ────────────────────────────────────────────────────

async function run<T>(fn: () => Promise<T>, format: (v: T) => string = v => JSON.stringify(v, null, 2)) {
  try {
    const result = await fn()
    return { content: [{ type: 'text' as const, text: format(result) }] }
  } catch (err) {
    return { isError: true as const, content: [{ type: 'text' as const, text: String(err) }] }
  }
}

const TICKET_ID_SCHEMA = {
  ticket_id: z.string().describe('The Ticksy ticket ID'),
}

// ── Read tools ──────────────────────────────────────────────────

server.registerTool(
  'list_open_tickets',
  {
    description: 'List open tickets (summary). Use get_ticket for full details.',
    inputSchema: {
      needs_response_only: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, return only tickets where the customer is waiting for a reply'),
    },
  },
  async ({ needs_response_only }) => run(() => listOpenTickets(needs_response_only)),
)

server.registerTool(
  'list_closed_tickets',
  { description: 'List recently closed tickets (summary). Use get_ticket for full details.' },
  async () => run(() => listClosedTickets()),
)

server.registerTool(
  'get_ticket',
  {
    description: 'Get a single ticket with its full comment thread.',
    inputSchema: TICKET_ID_SCHEMA,
  },
  async ({ ticket_id }) => run(() => getTicket(ticket_id)),
)

server.registerTool(
  'get_ticket_comments',
  {
    description: 'Get comments for a ticket without full ticket data.',
    inputSchema: TICKET_ID_SCHEMA,
  },
  async ({ ticket_id }) => run(() => getTicketComments(ticket_id)),
)

server.registerTool(
  'list_my_tickets',
  { description: 'List your assigned open tickets (summary). Use get_ticket for full details.' },
  async () => run(() => listMyTickets()),
)

server.registerTool(
  'count_responses_needed',
  { description: 'Count open tickets awaiting a support response.' },
  async () => run(() => countResponsesNeeded(), String),
)

server.registerTool(
  'count_my_responses',
  { description: 'Count tickets assigned to you that await a response.' },
  async () => run(() => countMyResponsesNeeded(), String),
)

// ── Write tools ─────────────────────────────────────────────────

server.registerTool(
  'reply_to_ticket',
  {
    description: 'Post a public reply visible to the customer.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      ticket_id: z.string().describe('The Ticksy ticket ID'),
      comment: z.string().describe('Reply body (HTML is accepted)'),
      private: z.boolean().optional().default(false).describe('If true, the reply is visible only to staff'),
    },
  },
  async ({ ticket_id, comment, private: isPrivate }) => run(() => replyToTicket(ticket_id, comment, isPrivate)),
)

server.registerTool(
  'add_ticket_note',
  {
    description: 'Post an internal note visible only to staff.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      ticket_id: z.string().describe('The Ticksy ticket ID'),
      comment: z.string().describe('Note body (HTML is accepted)'),
    },
  },
  async ({ ticket_id, comment }) => run(() => addTicketNote(ticket_id, comment)),
)

const SIMPLE_WRITE_TOOLS: Array<[string, string, (id: string) => Promise<unknown>]> = [
  ['close_ticket', 'Close an open ticket.', closeTicket],
  ['reopen_ticket', 'Reopen a closed ticket.', openTicket],
  ['mark_ticket_read', 'Mark a ticket as read.', markAsRead],
  ['mark_ticket_unread', 'Mark a ticket as unread.', markAsUnread],
  ['star_ticket', 'Star a ticket for follow-up.', starTicket],
  ['unstar_ticket', 'Remove star from a ticket.', unstarTicket],
]

for (const [name, description, fn] of SIMPLE_WRITE_TOOLS) {
  server.registerTool(
    name,
    { description, annotations: { readOnlyHint: false }, inputSchema: TICKET_ID_SCHEMA },
    async ({ ticket_id }) => run(() => fn(ticket_id)),
  )
}

server.registerTool(
  'create_customer',
  {
    description: 'Create a new customer account.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      first_name: z.string().describe('Customer first name'),
      email: z.string().describe('Customer email address'),
      password: z.string().describe('Account password'),
    },
  },
  async ({ first_name, email, password }) => run(() => createCustomer(first_name, email, password)),
)

// ── Start ──────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
