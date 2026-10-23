import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Contact, Message, Note } from '@/lib/types';
import { Skeleton } from '@/components/ui';
import { Conversation } from './conversation';
import { ContactPanel } from './contact-panel';

async function ContactView({ params }: { params: PageProps<'/inbox/[contactId]'>['params'] }) {
  const { contactId } = await params;
  // La ventana de 24 h se calcula con Date.now(): renderizar por request.
  await connection();
  const supabase = await createClient();

  const [{ data: contact }, { data: messages }, { data: notes }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', contactId).single(),
    supabase.from('messages').select('*').eq('contact_id', contactId).order('sent_at', { ascending: false }).limit(300),
    supabase.from('notes').select('id, body, created_at').eq('contact_id', contactId).order('created_at', { ascending: false }),
  ]);

  if (!contact) notFound();

  return (
    <>
      <Conversation key={contactId} contact={contact as Contact} initial={((messages ?? []) as Message[]).reverse()} />
      <ContactPanel key={`panel-${contactId}`} contact={contact as Contact} notes={(notes ?? []) as Note[]} />
    </>
  );
}

function ConversationSkeleton() {
  return (
    <>
      <div className="flex flex-1 flex-col gap-4 rounded-[28px] bg-surface p-6 ring-1 ring-line">
        <Skeleton className="h-10 w-56 rounded-full" />
        <div className="flex-1 space-y-3 pt-6">
          <Skeleton className="h-10 w-2/5" />
          <Skeleton className="ml-auto h-10 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
        <Skeleton className="h-14 rounded-full" />
      </div>
      <Skeleton className="hidden w-80 rounded-[28px] xl:block" />
    </>
  );
}

export default function ContactPage({ params }: PageProps<'/inbox/[contactId]'>) {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <ContactView params={params} />
    </Suspense>
  );
}
