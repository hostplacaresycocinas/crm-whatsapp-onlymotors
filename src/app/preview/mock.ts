// Datos de ejemplo para revisar el diseño sin Supabase (/preview, solo en desarrollo).
import type { Contact, Message, Note, Stage } from '@/lib/types';
import { STAGES } from '@/lib/types';
import type { PanelStats } from '../(app)/panel';

const H = 3_600_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const people: [string, string, Stage, number, string, number, number | null][] = [
  ['Martín Gómez', '5491155550001', 'negociando', 0.2, '¿Me lo dejan en 18.5 con mi Gol de entrega?', 2, -2 * H],
  ['Lucía Fernández', '5491155550002', 'interesado', 1.5, 'Perfecto, el sábado paso a verla', 0, 20 * H],
  ['Carlos Ruiz', '5491155550003', 'nuevo', 3, 'Hola! Sigue disponible la Hilux 2021?', 1, null],
  ['Sofía Ibarra', '5491155550004', 'contactado', 26, 'Gracias, lo hablo con mi marido', 0, -5 * H],
  ['Diego Paz', '5491155550005', 'ganado', 50, 'Ya transferí la seña 🙌', 0, null],
  ['Valentina Sosa', '5491155550006', 'interesado', 6, '¿Tienen financiación en 24 cuotas?', 0, 48 * H],
  ['Jorge Medina', '5491155550007', 'perdido', 120, 'Al final compré en otro lado, gracias', 0, null],
  ['Ana Torres', '5491155550008', 'nuevo', 9, '¿Cuántos km tiene el Corolla?', 3, null],
  ['Federico Luna', '5491155550009', 'negociando', 30, 'Mandame fotos del interior', 0, -1 * H],
];

export const contacts: Contact[] = people.map(([name, wa_id, stage, hAgo, preview, unread, follow], i) => ({
  id: `c${i}`,
  tenant_id: 't',
  wa_id,
  name,
  stage,
  follow_up_at: follow === null ? null : new Date(now + follow).toISOString(),
  last_message_at: iso(hAgo * H),
  last_inbound_at: iso(hAgo * H),
  last_message_preview: preview,
  unread_count: unread,
}));

const thread: [number, 'in' | 'out', Message['source'], string][] = [
  [27, 'in', 'customer', 'Hola, buenas tardes. Vi el Cruze 2019 en Instagram, ¿sigue disponible?'],
  [26.8, 'out', 'app', '¡Hola Martín! Sí, está disponible. Tiene 62.000 km, service oficial y único dueño.'],
  [26.7, 'out', 'app', 'Te paso la ficha completa con fotos.'],
  [26, 'in', 'customer', 'Genial. ¿Toman usado? Tengo un Gol Trend 2016.'],
  [1.2, 'out', 'api', 'Sí, tomamos usados. Si querés traelo y lo tasamos en el momento.'],
  [0.4, 'in', 'customer', 'Dale. Lo llevo el jueves a la tarde.'],
  [0.2, 'in', 'customer', '¿Me lo dejan en 18.5 con mi Gol de entrega?'],
];

export const messages: Message[] = thread.map(([hAgo, direction, source, body], i) => ({
  id: `m${i}`,
  contact_id: 'c0',
  wa_message_id: `w${i}`,
  direction,
  source,
  type: 'text',
  body,
  status: direction === 'out' ? 'read' : null,
  sent_at: iso(hAgo * H),
}));

export const notes: Note[] = [
  { id: 'n1', body: 'Busca sedán automático hasta 20M. Entrega Gol Trend 2016 (tasación aprox 7M).', created_at: iso(26 * H) },
  { id: 'n2', body: 'Prefiere que lo llamen después de las 18.', created_at: iso(50 * H) },
];

const series = [6, 9, 4, 11, 8, 13, 7, 5, 12, 15, 9, 14, 10, 8];
export const stats: PanelStats = {
  unanswered: 3,
  due: 3,
  active: 7,
  won: 1,
  total: contacts.length,
  days: series.map((n, i) => {
    const date = new Date(now - (13 - i) * 24 * H);
    return { key: `d${i}`, date: date.toISOString(), in: n, out: Math.round(n * 0.8) };
  }),
  stages: STAGES.map((s) => ({ ...s, count: contacts.filter((c) => c.stage === s.value).length })),
  dueList: contacts.filter((c) => c.follow_up_at && new Date(c.follow_up_at).getTime() <= now),
};
