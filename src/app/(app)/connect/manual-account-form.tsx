'use client';

import { useActionState } from 'react';
import { fieldClass, primaryButtonClass } from '@/components/form';
import { saveManualAccount } from './actions';

// Para el número de prueba de Meta: los datos salen de "Paso 1. Pruébalo" en el panel de la app.
export function ManualAccountForm() {
  const [error, action, pending] = useActionState(saveManualAccount, null);

  return (
    <form action={action} className="space-y-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <input name="phone_number_id" required placeholder="Identificador del número de teléfono" className={fieldClass} />
        <input name="waba_id" required placeholder="Identificador de la cuenta de WhatsApp Business" className={fieldClass} />
      </div>
      <input name="access_token" type="password" required placeholder="Token de acceso temporal" autoComplete="off" className={fieldClass} />
      {error && <p className="px-1 text-[13px] text-red-700">{error}</p>}
      <button disabled={pending} className={primaryButtonClass}>
        {pending ? 'Guardando…' : 'Guardar número'}
      </button>
    </form>
  );
}
