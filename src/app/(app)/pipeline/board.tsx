'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, EASE } from '@/components/ui';
import { formatDue, formatTime, initials } from '@/lib/format';
import { STAGES, displayName, type Contact, type Stage } from '@/lib/types';
import { updateContact } from '../inbox/actions';

export function Board({ initial }: { initial: Contact[] }) {
  const [contacts, setContacts] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, ({ new: row }) => {
        const c = row as Contact;
        if (!c?.id) return;
        setContacts((prev) => (prev.some((p) => p.id === c.id) ? prev.map((p) => (p.id === c.id ? c : p)) : [c, ...prev]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function moveTo(stage: Stage) {
    const id = dragging;
    setDragging(null);
    setOver(null);
    const previous = contacts.find((c) => c.id === id)?.stage;
    if (!id || !previous || previous === stage) return;
    const setStage = (s: Stage) => setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, stage: s } : c)));
    setStage(stage);
    // Si no se pudo guardar, la tarjeta vuelve a su columna.
    updateContact(id, { stage }).catch(() => setStage(previous));
  }

  return (
    <LayoutGroup>
      <div className="scroll-thin -mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-4 lg:-mx-8 lg:px-8">
        {STAGES.map((s, col) => {
          const items = contacts.filter((c) => c.stage === s.value);
          const isOver = over === s.value;
          return (
            <motion.section
              key={s.value}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: col * 0.06, ease: EASE }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.value);
              }}
              onDragLeave={() => setOver((o) => (o === s.value ? null : o))}
              onDrop={() => moveTo(s.value)}
              className={`flex h-[calc(100vh-170px)] w-72 shrink-0 flex-col rounded-[26px] p-2 ring-1 transition-colors duration-200 ${
                isOver ? 'bg-surface ring-ink' : 'bg-black/[0.03] ring-line'
              }`}
            >
              <header className="flex items-center justify-between px-3 py-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className={`size-2 rounded-full ${s.value === 'perdido' ? 'bg-muted' : 'bg-ink'}`} />
                  {s.label}
                </span>
                <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-muted ring-1 ring-line">{items.length}</span>
              </header>

              <ul className="scroll-thin flex-1 space-y-2 overflow-y-auto">
                {items.map((c) => (
                  <motion.li
                    key={c.id}
                    layoutId={`card-${c.id}`}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className={`rounded-2xl transition-opacity ${dragging === c.id ? 'opacity-40' : ''}`}
                  >
                    {/* Drag nativo en un div: motion redefine los eventos onDrag* de sus elementos. */}
                    <div
                      draggable
                      onDragStart={() => setDragging(c.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      className="cursor-grab rounded-2xl bg-surface p-3.5 ring-1 ring-line transition-shadow hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] active:cursor-grabbing"
                    >
                    <Link href={`/inbox/${c.id}`} draggable={false} className="block">
                      <div className="flex items-center gap-2.5">
                        <Avatar label={initials(c.name, c.wa_id)} dark={c.unread_count > 0} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{displayName(c)}</p>
                          <p className="font-mono text-[10px] text-muted">{formatTime(c.last_message_at)}</p>
                        </div>
                      </div>
                      {c.last_message_preview && <p className="mt-2.5 line-clamp-2 text-[13px] text-ink-2">{c.last_message_preview}</p>}
                      {c.follow_up_at && (
                        <span
                          className={`mt-2.5 inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] ring-1 ${
                            formatDue(c.follow_up_at) === 'Vencido' ? 'bg-ink text-white ring-ink' : 'bg-soft text-ink-2 ring-line'
                          }`}
                        >
                          Seguimiento · {formatDue(c.follow_up_at)}
                        </span>
                      )}
                    </Link>
                    </div>
                  </motion.li>
                ))}
                {items.length === 0 && (
                  <li className="hatch rounded-2xl px-3 py-8 text-center text-xs text-muted ring-1 ring-line">Soltá un contacto acá</li>
                )}
              </ul>
            </motion.section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
