'use client';

import { Fragment, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, EASE } from '@/components/ui';
import { dayKey, formatClock, formatDayLabel, initials } from '@/lib/format';
import { SERVICE_WINDOW_MS, displayName, isWindowOpen, type Contact, type Message } from '@/lib/types';
import { markRead, sendMessage } from '../actions';

const SOURCE_LABEL = { app: 'Celular', api: 'CRM', customer: '' } as const;
const STATUS_LABEL: Record<string, string> = { sent: 'enviado', delivered: 'entregado', read: 'leído', failed: 'falló' };
const QUICK_REPLIES = ['¿Seguís interesado?', 'Te paso la ficha completa', '¿Cuándo podés pasar a verlo?', 'Aceptamos tu usado'];

function WindowChip({ lastInbound }: { lastInbound: string | null }) {
  // Se calcula una vez por mensaje entrante; alcanza para un chip informativo.
  const [left] = useState(() =>
    lastInbound ? SERVICE_WINDOW_MS - (Date.now() - new Date(lastInbound).getTime()) : 0
  );
  const open = left > 0;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[11px] ring-1 ${
        open ? 'bg-ink text-white ring-ink' : 'hatch text-ink-2 ring-line'
      }`}
    >
      <span className={`size-1.5 rounded-full ${open ? 'bg-white' : 'bg-muted'}`} />
      {open ? `Ventana abierta · ${Math.max(1, Math.round(left / 3_600_000))} h` : 'Ventana cerrada'}
    </span>
  );
}

export function Conversation({ contact, initial }: { contact: Contact; initial: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Solo se animan los mensajes que llegan después de abrir el chat.
  const [seen] = useState(() => new Set(initial.map((m) => m.id)));

  const lastInbound = messages.findLast((m) => m.direction === 'in')?.sent_at ?? contact.last_inbound_at;
  const canSend = isWindowOpen(lastInbound);

  useEffect(() => {
    markRead(contact.id);
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${contact.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `contact_id=eq.${contact.id}` },
        ({ new: row }) => {
          const m = row as Message;
          if (!m?.id) return;
          setMessages((prev) => {
            const exists = prev.some((p) => p.id === m.id);
            const next = exists ? prev.map((p) => (p.id === m.id ? m : p)) : [...prev, m];
            return next.sort((a, b) => a.sent_at.localeCompare(b.sent_at));
          });
          if (m.direction === 'in') markRead(contact.id);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [contact.id]);

  // Al abrir: salto directo al final. Mensajes nuevos: scroll suave.
  const firstScroll = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? 'instant' : 'smooth' });
    firstScroll.current = false;
  }, [messages.length]);

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    startTransition(async () => {
      const res = await sendMessage(contact.id, body);
      setError(res.error);
      if (!res.error) setDraft('');
    });
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-surface ring-1 ring-line">
      <header className="flex items-center gap-3 border-b border-line px-6 py-4">
        <Avatar label={initials(contact.name, contact.wa_id)} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-semibold tracking-tight">{displayName(contact)}</h2>
          <p className="font-mono text-[11px] text-muted">+{contact.wa_id}</p>
        </div>
        <WindowChip key={lastInbound} lastInbound={lastInbound} />
      </header>

      <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto px-6 py-6">
        {messages.map((m, i) => {
          const out = m.direction === 'out';
          const newDay = i === 0 || dayKey(new Date(messages[i - 1].sent_at)) !== dayKey(new Date(m.sent_at));
          const grouped = !newDay && messages[i - 1].direction === m.direction;
          return (
            <Fragment key={m.id}>
              {newDay && (
                <div className="my-6 flex justify-center first:mt-0">
                  <span className="rounded-full bg-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {formatDayLabel(m.sent_at)}
                  </span>
                </div>
              )}
              <motion.div
                initial={seen.has(m.id) ? false : { opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: EASE }}
                className={`flex flex-col ${out ? 'items-end' : 'items-start'} ${grouped ? 'mt-1' : 'mt-4'}`}
              >
                <div
                  className={`max-w-[68%] rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed ${
                    out ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-soft text-ink ring-1 ring-line'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body ?? <em className="opacity-60">[{m.type}]</em>}</p>
                </div>
                <p className="mt-1 px-1 font-mono text-[10px] text-muted">
                  {out && SOURCE_LABEL[m.source] && `${SOURCE_LABEL[m.source]} · `}
                  {formatClock(m.sent_at)}
                  {out && m.status && ` · ${STATUS_LABEL[m.status] ?? m.status}`}
                </p>
              </motion.div>
            </Fragment>
          );
        })}
      </div>

      <div className="px-5 pb-5">
        <AnimatePresence mode="wait" initial={false}>
          {canSend ? (
            <motion.div key="open" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }}>
              <div className="scroll-thin mb-3 flex gap-1.5 overflow-x-auto">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setDraft(q)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs text-ink-2 ring-1 ring-line transition hover:bg-ink hover:text-white hover:ring-ink"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-[22px] bg-surface p-1.5 pl-4 ring-1 ring-line transition focus-within:ring-ink">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Escribí una respuesta…"
                  className="field-sizing-content max-h-40 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                />
                <motion.button
                  onClick={send}
                  disabled={!draft.trim() || pending}
                  aria-label="Enviar"
                  animate={{ backgroundColor: draft.trim() ? '#0a0a0a' : '#f5f5f5', color: draft.trim() ? '#ffffff' : '#8c8c8c' }}
                  whileTap={{ scale: 0.9 }}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full"
                >
                  <ArrowUp className="size-4" strokeWidth={2} />
                </motion.button>
              </div>
              <p className="mt-2 px-2 font-mono text-[10px] text-muted">
                {error ? <span className="text-ink">{error}</span> : 'Enter para enviar · Shift + Enter para nueva línea'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="closed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="hatch flex flex-wrap items-center justify-between gap-3 rounded-[22px] p-4 ring-1 ring-line"
            >
              <p className="max-w-md text-[13px] text-ink-2">
                Pasaron más de 24 h desde su último mensaje. Escribile desde el celular para no pagar plantilla: el mensaje aparece acá igual.
              </p>
              <a
                href={`https://wa.me/${contact.wa_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] text-white transition hover:bg-ink-2"
              >
                Abrir en WhatsApp <ExternalLink className="size-3.5" strokeWidth={1.75} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
