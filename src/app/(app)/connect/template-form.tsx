'use client';

import { useActionState } from 'react';
import { fieldClass, primaryButtonClass } from '@/components/form';
import { createTemplateAction } from './actions';

type Account = { id: string; label: string };

export function TemplateForm({ accounts }: { accounts: Account[] }) {
  const [state, action, pending] = useActionState(createTemplateAction, null);

  return (
    <form action={action} className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        <select name="account_id" className={fieldClass}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <input name="name" required placeholder="nombre_de_plantilla" className={fieldClass} />
        <select name="category" className={fieldClass}>
          <option value="UTILITY">Utilidad</option>
          <option value="MARKETING">Marketing</option>
        </select>
      </div>
      <textarea
        name="body"
        required
        rows={3}
        placeholder="Hola, te escribimos de Only Motors para confirmar tu visita al showroom."
        className={`${fieldClass} resize-none`}
      />
      {state?.error && <p className="px-1 text-[13px] text-red-700">{state.error}</p>}
      {state?.ok && <p className="px-1 text-[13px] text-emerald-700">{state.ok}</p>}
      <button disabled={pending} className={primaryButtonClass}>
        {pending ? 'Creando…' : 'Crear plantilla'}
      </button>
    </form>
  );
}
