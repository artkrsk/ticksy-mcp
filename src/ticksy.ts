import { html as htmlDecode } from './utils.js'

const BASE_URL = `https://api.ticksy.com/v1/${process.env.TICKSY_DOMAIN}/${process.env.TICKSY_API_KEY}`

// ── Types ──────────────────────────────────────────────────────

export interface TicketComment {
  comment_id: string
  ticket_id: string
  user_id: string
  commenter_name: string
  commenter_email: string
  user_type: 'user' | 'employee'
  comment: string      // HTML-encoded in raw API
  body?: string        // decoded plain text
  private: '0' | '1'
  type: 'comment' | 'note'
  time_stamp: string
  quoted_text: string | null
  attachments: Array<{
    id: string
    file_url: string
    file_name: string
  }>
  // detail-only fields (present in ticket.json, absent in list endpoints)
  post_date?: string
  user_avatar?: string
  user_likes?: string
  my_reply?: '0' | '1'
  username?: string
  status_string?: string
}

export interface Ticket {
  ticket_title: string
  status: 'open' | 'closed'
  time_stamp: string
  needs_response: '0' | '1'
  starred: '0' | '1'
  ticket_type: string
  user_id: string
  assigned_to: string
  assigned_to_email: string
  category_id: string
  related_url: string
  // list-only fields (present in open/closed-tickets.json, absent in ticket.json)
  ticket_id?: string
  elapsed_time?: string
  user_name?: string
  user_email?: string
  user_avatar?: string
  assigned_to_name?: string
  response_time?: string
  envato_purchase_code?: string
  envato_verified_string?: string
  ticket_comments?: TicketComment[]
  // detail-only fields (present in ticket.json, absent in list endpoints)
  opened_by_me?: '0' | '1'
  unsubscribed?: '0' | '1'
}

// ── Helpers ────────────────────────────────────────────────────

function decodeComment(comment: TicketComment): TicketComment {
  return { ...comment, body: htmlDecode(comment.comment) }
}

function summarizeTicket(ticket: Ticket): Partial<Ticket> {
  return {
    ticket_id: ticket.ticket_id,
    ticket_title: ticket.ticket_title,
    status: ticket.status,
    needs_response: ticket.needs_response,
    starred: ticket.starred,
    ticket_type: ticket.ticket_type,
    user_name: ticket.user_name,
    user_email: ticket.user_email,
    assigned_to_name: ticket.assigned_to_name,
    elapsed_time: ticket.elapsed_time,
    time_stamp: ticket.time_stamp,
  }
}

function decodeTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    ticket_comments: (ticket.ticket_comments ?? []).map(decodeComment),
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}/${path}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) { throw new Error(`Ticksy API ${path}: ${res.status} ${res.statusText}`) }
  return res.json() as Promise<T>
}

async function post(action: string, params: Record<string, string> = {}): Promise<unknown> {
  const body = new URLSearchParams({ action, ...params })
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) { throw new Error(`Ticksy API ${action}: ${res.status} ${res.statusText}`) }
  return res.json()
}

// ── API calls ──────────────────────────────────────────────────

export async function listOpenTickets(needsResponseOnly = false): Promise<Partial<Ticket>[]> {
  const data = await get<{ 'open-tickets': Ticket[] }>('open-tickets.json')
  const tickets = data['open-tickets'] ?? []
  const filtered = needsResponseOnly ? tickets.filter(t => t.needs_response === '1') : tickets
  return filtered.map(summarizeTicket)
}

export async function listClosedTickets(): Promise<Partial<Ticket>[]> {
  const data = await get<{ 'closed-tickets': Ticket[] }>('closed-tickets.json')
  return (data['closed-tickets'] ?? []).map(summarizeTicket)
}

export async function getTicket(ticketId: string): Promise<{ data: Ticket; comments: TicketComment[] }> {
  const raw = await get<{ 'ticket-data': Ticket; 'ticket-comments': TicketComment[] }>(`ticket.json/${ticketId}`)
  return {
    data: decodeTicket(raw['ticket-data']),
    comments: (raw['ticket-comments'] ?? []).map(decodeComment),
  }
}

export async function getTicketComments(ticketId: string): Promise<TicketComment[]> {
  const data = await get<{ ticket_comments: TicketComment[] }>(`ticket-comments.json/${ticketId}`)
  return (data.ticket_comments ?? []).map(decodeComment)
}

export async function listMyTickets(): Promise<Partial<Ticket>[]> {
  const data = await get<{ 'my-tickets': Ticket[] }>('my-tickets.json')
  return (data['my-tickets'] ?? []).map(summarizeTicket)
}

export async function countResponsesNeeded(): Promise<number> {
  const data = await get<{ 'responses-needed': string }>('responses-needed.json')
  return parseInt(data['responses-needed'] ?? '0', 10)
}

export async function countMyResponsesNeeded(): Promise<number> {
  const data = await get<{ 'responses-needed': string }>('my-responses-needed.json')
  return parseInt(data['responses-needed'] ?? '0', 10)
}

// ── Write operations ────────────────────────────────────────────

export async function closeTicket(ticketId: string): Promise<unknown> {
  return post('close_ticket', { ticket_id: ticketId })
}

export async function openTicket(ticketId: string): Promise<unknown> {
  return post('open_ticket', { ticket_id: ticketId })
}

export async function markAsRead(ticketId: string): Promise<unknown> {
  return post('mark_as_read', { ticket_id: ticketId })
}

export async function markAsUnread(ticketId: string): Promise<unknown> {
  return post('mark_as_unread', { ticket_id: ticketId })
}

export async function starTicket(ticketId: string): Promise<unknown> {
  return post('star_ticket', { ticket_id: ticketId })
}

export async function unstarTicket(ticketId: string): Promise<unknown> {
  return post('unstar_ticket', { ticket_id: ticketId })
}

export async function createCustomer(firstName: string, email: string, password: string): Promise<unknown> {
  return post('new_customer', { first_name: firstName, email_address: email, password })
}

export async function replyToTicket(ticketId: string, comment: string, isPrivate = false): Promise<unknown> {
  const params: Record<string, string> = { ticket_id: ticketId, comment }
  if (isPrivate) { params.private = 'true' }
  return post('new_ticket_comment', params)
}

export async function addTicketNote(ticketId: string, comment: string): Promise<unknown> {
  return post('new_ticket_note', { ticket_id: ticketId, comment })
}
