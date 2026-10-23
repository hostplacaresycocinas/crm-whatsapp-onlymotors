export const STAGES = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-sky-100 text-sky-800' },
  { value: 'contactado', label: 'Contactado', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'interesado', label: 'Interesado', color: 'bg-amber-100 text-amber-800' },
  { value: 'negociando', label: 'Negociando', color: 'bg-orange-100 text-orange-800' },
  { value: 'ganado', label: 'Ganado', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'perdido', label: 'Perdido', color: 'bg-zinc-200 text-zinc-700' },
] as const;

export type Stage = (typeof STAGES)[number]['value'];

export type Contact = {
  id: string;
  tenant_id: string;
  wa_id: string;
  name: string | null;
  stage: Stage;
  follow_up_at: string | null;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
};

export type Message = {
  id: string;
  contact_id: string;
  wa_message_id: string;
  direction: 'in' | 'out';
  source: 'customer' | 'app' | 'api';
  type: string;
  body: string | null;
  status: string | null;
  sent_at: string;
};

export type Note = {
  id: string;
  body: string;
  created_at: string;
};

export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWindowOpen(lastInboundAt: string | null) {
  return !!lastInboundAt && Date.now() - new Date(lastInboundAt).getTime() < SERVICE_WINDOW_MS;
}

export function displayName(c: Pick<Contact, 'name' | 'wa_id'>) {
  return c.name || `+${c.wa_id}`;
}
