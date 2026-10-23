import type { ReactNode } from 'react';
import { LiveDot } from './ui';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <LiveDot />
      </div>
    </header>
  );
}
