'use client';

import { useActionState } from 'react';
import { fieldClass, primaryButtonClass } from '@/components/form';
import { saveCatalogId } from './actions';

export function CatalogSettings({ catalogId }: { catalogId: string | null }) {
  const [error, action, pending] = useActionState(saveCatalogId, null);

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input
        name="catalog_id"
        required
        defaultValue={catalogId ?? ''}
        placeholder="Identificador del catálogo (Commerce Manager)"
        className={`${fieldClass} max-w-sm`}
      />
      <button disabled={pending} className={primaryButtonClass}>
        {pending ? 'Verificando…' : 'Guardar'}
      </button>
      {error && <p className="w-full px-1 text-[13px] text-red-700">{error}</p>}
    </form>
  );
}
