import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dayKey } from '@/lib/format';
import { STAGES, type Contact } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui';
import { Panel, type PanelStats } from './panel';

const DAY = 86_400_000;
const DAYS = 14;

async function loadStats(): Promise<PanelStats> {
  // El prefetch con cookies no alcanza: Date.now() tiene que correr por request.
  await connection();
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - (DAYS - 1) * DAY);

  const [{ data: contacts }, { data: messages }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, wa_id, stage, follow_up_at, last_message_at, last_message_preview, unread_count')
      .limit(5000),
    supabase.from('messages').select('direction, sent_at').gte('sent_at', since.toISOString()).limit(20000),
  ]);

  const list = (contacts ?? []) as Contact[];

  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY);
    return { key: dayKey(date), date: date.toISOString(), in: 0, out: 0 };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const m of messages ?? []) {
    const bucket = byKey.get(dayKey(new Date(m.sent_at)));
    if (bucket) bucket[m.direction as 'in' | 'out']++;
  }

  const due = list
    .filter((c) => c.follow_up_at && new Date(c.follow_up_at).getTime() <= now)
    .sort((a, b) => a.follow_up_at!.localeCompare(b.follow_up_at!));

  return {
    unanswered: list.filter((c) => c.unread_count > 0).length,
    due: due.length,
    active: list.filter((c) => c.last_message_at && now - new Date(c.last_message_at).getTime() < 7 * DAY).length,
    won: list.filter((c) => c.stage === 'ganado').length,
    total: list.length,
    days,
    stages: STAGES.map((s) => ({ ...s, count: list.filter((c) => c.stage === s.value).length })),
    dueList: due.slice(0, 6),
  };
}

async function PanelData() {
  return <Panel stats={await loadStats()} />;
}

function PanelSkeleton() {
  return (
    <div className="mt-8 grid gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-[26px]" />
      ))}
      <Skeleton className="h-80 rounded-[26px] lg:col-span-3" />
      <Skeleton className="h-80 rounded-[26px]" />
    </div>
  );
}

export default function PanelPage() {
  return (
    <div className="mx-auto max-w-[1400px] p-5 lg:p-8">
      <PageHeader title="Panel" subtitle="Cómo vienen tus conversaciones y seguimientos." />
      <Suspense fallback={<PanelSkeleton />}>
        <PanelData />
      </Suspense>
    </div>
  );
}
