import { RailNav } from '@/components/rail';
import { ContactList } from '../../(app)/inbox/contact-list';
import { Conversation } from '../../(app)/inbox/[contactId]/conversation';
import { ContactPanel } from '../../(app)/inbox/[contactId]/contact-panel';
import { contacts, messages, notes } from '../mock';

export default function PreviewInbox() {
  return (
    <div className="min-h-screen pl-[68px]">
      <RailNav pathname="/inbox" />
      <div className="flex h-screen gap-3 p-3">
        <aside className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-surface ring-1 ring-line">
          <ContactList initial={contacts} />
        </aside>
        <main className="flex min-w-0 flex-1 gap-3">
          <Conversation contact={contacts[0]} initial={messages} />
          <ContactPanel contact={contacts[0]} notes={notes} />
        </main>
      </div>
    </div>
  );
}
