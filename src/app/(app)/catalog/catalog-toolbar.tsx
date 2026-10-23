'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { primaryButtonClass, secondaryButtonClass } from '@/components/form';
import { importFromCatalog, publishAll } from './actions';

export function CatalogToolbar({ hasCatalog }: { hasCatalog: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error: string | null; message?: string } | null>(null);

  const run = (fn: typeof publishAll) => startTransition(async () => setResult(await fn()));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link href="/catalog/new" className={primaryButtonClass}>
          Nuevo auto
        </Link>
        <button disabled={!hasCatalog || pending} onClick={() => run(publishAll)} className={secondaryButtonClass}>
          Publicar todo en WhatsApp
        </button>
        <button disabled={!hasCatalog || pending} onClick={() => run(importFromCatalog)} className={secondaryButtonClass}>
          Importar del catálogo
        </button>
      </div>
      {pending && <p className="text-[13px] text-muted">Hablando con Meta…</p>}
      {result?.error && <p className="text-[13px] text-red-700">{result.error}</p>}
      {result?.message && <p className="text-[13px] text-emerald-700">{result.message}</p>}
    </div>
  );
}
