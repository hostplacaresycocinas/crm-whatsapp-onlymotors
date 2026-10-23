'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { Avatar, CountUp, EASE, rise, stagger } from '@/components/ui';
import { formatDue, formatShortDate, initials } from '@/lib/format';
import { displayName, type Contact, type STAGES } from '@/lib/types';

export type PanelStats = {
  unanswered: number;
  due: number;
  active: number;
  won: number;
  total: number;
  days: { key: string; date: string; in: number; out: number }[];
  stages: ((typeof STAGES)[number] & { count: number })[];
  dueList: Contact[];
};

function Kpi({ label, value, hint, href, dark = false }: { label: string; value: number; hint: string; href: string; dark?: boolean }) {
  return (
    <motion.div variants={rise}>
      <Link
        href={href}
        className={`group relative flex h-40 flex-col justify-between overflow-hidden rounded-[26px] p-5 transition-transform duration-300 hover:-translate-y-0.5 ${
          dark ? 'bg-ink text-white' : 'bg-surface ring-1 ring-line'
        }`}
      >
        {dark && <div className="hatch-inverse absolute inset-y-0 right-0 w-1/2 [mask-image:linear-gradient(to_left,black,transparent)]" />}
        <div className="relative flex items-center justify-between">
          <span className={`text-[13px] ${dark ? 'text-white/60' : 'text-muted'}`}>{label}</span>
          <span
            className={`flex size-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${
              dark ? 'bg-white text-ink' : 'bg-soft ring-1 ring-line'
            }`}
          >
            <ArrowUpRight className="size-4" strokeWidth={1.75} />
          </span>
        </div>
        <div className="relative">
          <CountUp value={value} className="font-display text-[44px] font-semibold leading-none tracking-[-0.04em]" />
          <p className={`mt-2 font-mono text-[11px] ${dark ? 'text-white/50' : 'text-muted'}`}>{hint}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ActivityChart({ days }: { days: PanelStats['days'] }) {
  const [hover, setHover] = useState(days.length - 1);
  const max = Math.max(4, ...days.map((d) => d.in + d.out));
  const current = days[hover];
  const totalIn = days.reduce((s, d) => s + d.in, 0);

  return (
    <motion.section variants={rise} className="rounded-[26px] bg-surface p-6 ring-1 ring-line lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Mensajes por día</h2>
          <p className="text-[13px] text-muted">
            <CountUp value={totalIn} /> recibidos en los últimos 14 días
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" /> Recibidos</span>
          <span className="flex items-center gap-1.5"><span className="hatch size-2.5 rounded-sm ring-1 ring-line" /> Enviados</span>
        </div>
      </div>

      <div className="relative mt-8 flex h-56 items-end gap-2" onMouseLeave={() => setHover(days.length - 1)}>
        {days.map((d, i) => {
          const active = i === hover;
          const inH = (d.in / max) * 100;
          const outH = (d.out / max) * 100;
          return (
            <button
              key={d.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              className="relative flex h-full flex-1 flex-col items-center justify-end gap-1 outline-none"
              aria-label={`${formatShortDate(new Date(d.date))}: ${d.in} recibidos, ${d.out} enviados`}
            >
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(outH, 2)}%` }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.03, ease: EASE }}
                className={`hatch w-full rounded-full ring-1 ring-line transition-opacity ${active ? 'opacity-100' : 'opacity-60'}`}
              />
              <motion.span
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(inH, 2)}%` }}
                transition={{ duration: 0.9, delay: 0.25 + i * 0.03, ease: EASE }}
                className={`w-full rounded-full transition-colors duration-300 ${active ? 'bg-gradient-to-b from-ink-2 to-ink' : 'bg-black/[0.08]'}`}
              />
            </button>
          );
        })}

        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute -top-4 z-10 min-w-36 rounded-2xl bg-ink px-4 py-3 text-white shadow-xl"
            style={{
              left: `${((hover + 0.5) / days.length) * 100}%`,
              translate: hover > days.length / 2 ? '-100% 0' : '0 0',
            }}
          >
            <p className="font-mono text-[11px] text-white/50">{formatShortDate(new Date(current.date))}</p>
            <div className="mt-1.5 flex justify-between gap-6 text-[13px]"><span className="text-white/60">Recibidos</span>{current.in}</div>
            <div className="flex justify-between gap-6 text-[13px]"><span className="text-white/60">Enviados</span>{current.out}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-3 flex justify-between font-mono text-[10px] text-muted">
        <span>{formatShortDate(new Date(days[0].date))}</span>
        <span>Hoy</span>
      </div>
    </motion.section>
  );
}

function Pipeline({ stages, total }: { stages: PanelStats['stages']; total: number }) {
  return (
    <motion.section variants={rise} className="flex flex-col rounded-[26px] bg-surface p-6 ring-1 ring-line">
      <div className="flex items-start justify-between">
        <h2 className="font-display text-lg font-semibold tracking-tight">Pipeline</h2>
        <Link href="/pipeline" className="text-[13px] text-muted hover:text-ink">Ver todo</Link>
      </div>
      <ul className="mt-6 flex flex-1 flex-col justify-between gap-3">
        {stages.map((s, i) => (
          <li key={s.value}>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink-2">{s.label}</span>
              <span className="font-mono text-muted">{s.count}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${total ? (s.count / total) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.06, ease: EASE }}
                className={`h-full rounded-full ${s.value === 'perdido' ? 'hatch bg-transparent ring-1 ring-line' : 'bg-ink'}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function FollowUps({ list }: { list: Contact[] }) {
  return (
    <motion.section variants={rise} className="rounded-[26px] bg-surface p-6 ring-1 ring-line lg:col-span-4">
      <h2 className="font-display text-lg font-semibold tracking-tight">Seguimientos para hoy</h2>
      {list.length === 0 ? (
        <div className="hatch mt-5 rounded-2xl p-6 text-center text-[13px] text-ink-2 ring-1 ring-line">
          Nada pendiente. Agendá seguimientos desde cada conversación.
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/inbox/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-soft p-3 transition-colors hover:bg-black/[0.06]">
                <Avatar label={initials(c.name, c.wa_id)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{displayName(c)}</p>
                  <p className="truncate text-[13px] text-muted">{c.last_message_preview}</p>
                </div>
                <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] text-white">
                  {formatDue(c.follow_up_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

export function Panel({ stats }: { stats: PanelStats }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Kpi dark label="Sin responder" value={stats.unanswered} hint="chats con mensajes sin leer" href="/inbox" />
      <Kpi label="Seguimientos" value={stats.due} hint="vencidos o para hoy" href="/inbox" />
      <Kpi label="Activos" value={stats.active} hint="con mensajes en 7 días" href="/inbox" />
      <Kpi label="Ganados" value={stats.won} hint={`de ${stats.total} contactos`} href="/pipeline" />
      <ActivityChart days={stats.days} />
      <Pipeline stages={stats.stages} total={stats.total} />
      <FollowUps list={stats.dueList} />
    </motion.div>
  );
}
