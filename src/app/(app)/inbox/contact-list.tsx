'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, EASE } from '@/components/ui';
import { formatTime, initials } from '@/lib/format';
import { STAGES, displayName, type Contact, type Stage } from '@/lib/types';

type Tab = 'todos' | 'sin-leer' | 'seguimiento';

const TABS: { value: Tab; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'sin-leer', label: 'Sin leer' },
  { value: 'seguimiento', label: 'Seguimiento' },
];

function sortByLastMessage(list: Contact[]) {
  return [...list].sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
}

export function ContactList({ initial }: { initial: Contact[] }) {
  const { contactId } = useParams<{ contactId?: string }>();
  const [contacts, setContacts] = useState(initial);
  const [tab, setTab] = useState<Tab>('todos');
  const [stage, setStage] = useState<Stage | null>(null);
  const [query, setQuery] = useState('');
  // Reloj para marcar seguimientos vencidos sin recargar.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, ({ new: row }) => {
        const c = row as Contact;
        if (!c?.id) return;
        setContacts((prev) => sortByLastMessage([c, ...prev.filter((p) => p.id !== c.id)]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isDue = (c: Contact) => !!c.follow_up_at && new Date(c.follow_up_at).getTime() <= now;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tab === 'sin-leer' && c.unread_count === 0) return false;
      if (tab === 'seguimiento' && !(c.follow_up_at && new Date(c.follow_up_at).getTime() <= now)) return false;
      if (stage && c.stage !== stage) return false;
      return !q || displayName(c).toLowerCase().includes(q) || c.wa_id.includes(q);
    });
  }, [contacts, tab, stage, query, now]);

  const unread = contacts.filter((c) => c.unread_count > 0).length;

  return (
    <>
      <div className="space-y-4 px-5 pb-3 pt-6">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">Conversaciones</h1>
          {unread > 0 && <span className="font-mono text-[11px] text-muted">{unread} sin leer</span>}
        </div>

        <label className="flex items-center gap-2 rounded-full bg-soft px-4 py-2.5 ring-1 ring-transparent transition focus-within:bg-surface focus-within:ring-ink">
          <Search className="size-4 text-muted" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá por nombre o número"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex rounded-full bg-soft p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`relative flex-1 rounded-full py-1.5 text-[13px] transition-colors ${tab === t.value ? 'text-white' : 'text-ink-2 hover:text-ink'}`}
            >
              {tab === t.value && (
                <motion.span layoutId="list-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="scroll-thin -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {STAGES.map((s) => {
            const active = stage === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setStage(active ? null : s.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                  active ? 'bg-ink text-white ring-ink' : 'text-ink-2 ring-line hover:ring-ink'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <LayoutGroup>
        <ul className="scroll-thin flex-1 overflow-y-auto px-2 pb-2">
          <AnimatePresence initial={false}>
            {visible.map((c, i) => {
              const active = c.id === contactId;
              const stageLabel = STAGES.find((s) => s.value === c.stage)?.label;
              return (
                <motion.li
                  key={c.id}
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: Math.min(i, 10) * 0.025, ease: EASE } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <Link href={`/inbox/${c.id}`} className="relative flex gap-3 rounded-2xl px-3 py-3">
                    {active && (
                      <motion.span layoutId="list-active" className="absolute inset-0 rounded-2xl bg-soft ring-1 ring-line" transition={{ type: 'spring', stiffness: 450, damping: 40 }} />
                    )}
                    <span className="relative">
                      <Avatar label={initials(c.name, c.wa_id)} dark={c.unread_count > 0} />
                    </span>
                    <div className="relative min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${c.unread_count > 0 ? 'font-semibold' : 'font-medium'}`}>{displayName(c)}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted">{formatTime(c.last_message_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 truncate text-[13px] ${c.unread_count > 0 ? 'text-ink' : 'text-muted'}`}>{c.last_message_preview}</p>
                        {c.unread_count > 0 && (
                          <motion.span
                            key={c.unread_count}
                            initial={{ scale: 0.4 }}
                            animate={{ scale: 1 }}
                            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 font-mono text-[10px] text-white"
                          >
                            {c.unread_count}
                          </motion.span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                        <span>{stageLabel}</span>
                        {isDue(c) && (
                          <>
                            <span className="size-0.5 rounded-full bg-muted" />
                            <span className="text-ink">Seguimiento</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {visible.length === 0 && (
            <li className="hatch mx-2 mt-2 rounded-2xl p-6 text-center text-[13px] text-ink-2 ring-1 ring-line">Sin conversaciones</li>
          )}
        </ul>
      </LayoutGroup>
    </>
  );
}
