import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Contact } from '@/lib/types';
import { Skeleton } from '@/components/ui';
import { ContactList } from './contact-list';

async function Contacts() {
  // La lista calcula horas relativas con Date.now(): renderizar por request.
  await connection();
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(500);

  return <ContactList initial={(contacts ?? []) as Contact[]} />;
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InboxLayout({ children }: LayoutProps<'/inbox'>) {
  return (
    <div className="flex h-screen gap-3 p-3">
      <aside className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-surface ring-1 ring-line">
        <Suspense fallback={<ListSkeleton />}>
          <Contacts />
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-1 gap-3">{children}</main>
    </div>
  );
}
