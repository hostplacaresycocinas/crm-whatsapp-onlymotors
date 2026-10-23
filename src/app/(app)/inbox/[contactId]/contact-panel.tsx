'use client';

import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar, EASE } from '@/components/ui';
import { formatClock, formatShortDate, initials } from '@/lib/format';
import { STAGES, displayName, type Contact, type Note, type Stage } from '@/lib/types';
import { addNote, updateContact } from '../actions';

// <input type="datetime-local"> trabaja en hora local sin zona.
function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 font-mono text-[10px] uppercase tracking-wider text-muted">{children}</p>;
}

export function ContactPanel({ contact, notes }: { contact: Contact; notes: Note[] }) {
  const [stage, setStage] = useState(contact.stage);
  const [followUp, setFollowUp] = useState(toLocalInput(contact.follow_up_at));
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  function changeStage(value: Stage) {
    setStage(value);
    startTransition(() => updateContact(contact.id, { stage: value }));
  }

  function changeFollowUp(value: string) {
    setFollowUp(value);
    startTransition(() => updateContact(contact.id, { follow_up_at: value ? new Date(value).toISOString() : null }));
  }

  function quickFollowUp(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0);
    changeFollowUp(toLocalInput(d.toISOString()));
  }

  function submitNote(e: React.FormEvent) {
    e.preventDefault();
    const body = note;
    setNote('');
    startTransition(() => addNote(contact.id, body));
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="scroll-thin hidden w-80 shrink-0 flex-col gap-7 overflow-y-auto rounded-[28px] bg-surface p-6 ring-1 ring-line xl:flex"
    >
      <div className="flex flex-col items-center text-center">
        <Avatar label={initials(contact.name, contact.wa_id)} size="lg" dark />
        <p className="mt-3 font-display text-lg font-semibold tracking-tight">{displayName(contact)}</p>
        <a href={`https://wa.me/${contact.wa_id}`} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-muted hover:text-ink">
          +{contact.wa_id}
        </a>
      </div>

      <div>
        <Label>Etapa</Label>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const active = stage === s.value;
            return (
              <button
                key={s.value}
                onClick={() => changeStage(s.value)}
                className={`relative rounded-full px-3 py-1.5 text-xs ring-1 transition-colors ${active ? 'text-white ring-ink' : 'text-ink-2 ring-line hover:ring-ink'}`}
              >
                {active && (
                  <motion.span layoutId="stage-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                )}
                <span className="relative">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Próximo seguimiento</Label>
        <input
          type="datetime-local"
          value={followUp}
          onChange={(e) => changeFollowUp(e.target.value)}
          className="w-full rounded-2xl bg-soft px-3 py-2.5 font-mono text-xs outline-none ring-1 ring-line focus:ring-ink"
        />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => quickFollowUp(d)}
              className="rounded-full py-1.5 text-xs text-ink-2 ring-1 ring-line transition hover:bg-ink hover:text-white hover:ring-ink"
            >
              +{d} {d === 1 ? 'día' : 'días'}
            </button>
          ))}
        </div>
        {followUp && (
          <button type="button" onClick={() => changeFollowUp('')} className="mt-2 text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
            Quitar seguimiento
          </button>
        )}
      </div>

      <div>
        <Label>Notas</Label>
        <form onSubmit={submitNote} className="rounded-2xl bg-soft p-1.5 ring-1 ring-line focus-within:ring-ink">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ej: busca SUV hasta 20M, tiene usado para entregar"
            className="w-full resize-none bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-muted"
          />
          <button disabled={pending || !note.trim()} className="w-full rounded-xl bg-ink py-2 text-xs font-medium text-white transition disabled:opacity-30">
            Agregar nota
          </button>
        </form>

        <ol className="relative mt-5 space-y-4 border-l border-line pl-4">
          <AnimatePresence initial={false}>
            {notes.map((n) => (
              <motion.li key={n.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: EASE }} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-ink ring-4 ring-surface" />
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{n.body}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {formatShortDate(new Date(n.created_at))} · {formatClock(n.created_at)}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </motion.aside>
  );
}
