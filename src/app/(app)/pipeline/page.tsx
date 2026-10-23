import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STAGES, type Contact } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui';
import { Board } from './board';

async function BoardData() {
  // Las tarjetas muestran fechas relativas con Date.now(): renderizar por request.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1000);
  return <Board initial={(data ?? []) as Contact[]} />;
}

function BoardSkeleton() {
  return (
    <div className="mt-8 flex gap-3 overflow-hidden">
      {STAGES.map((s) => (
        <Skeleton key={s.value} className="h-[60vh] w-72 shrink-0 rounded-[26px]" />
      ))}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <div className="p-5 lg:p-8">
      <PageHeader title="Pipeline" subtitle="Arrastrá cada contacto a la etapa en la que está." />
      <Suspense fallback={<BoardSkeleton />}>
        <BoardData />
      </Suspense>
    </div>
  );
}
