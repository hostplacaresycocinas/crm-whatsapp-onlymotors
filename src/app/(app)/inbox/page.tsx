import { MessageCircle } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="hatch flex flex-1 flex-col items-center justify-center gap-3 rounded-[28px] ring-1 ring-line">
      <span className="flex size-12 items-center justify-center rounded-full bg-ink text-white">
        <MessageCircle className="size-5" strokeWidth={1.75} />
      </span>
      <p className="rounded-full bg-surface px-4 py-2 text-sm text-ink-2 ring-1 ring-line">Elegí una conversación</p>
    </div>
  );
}
