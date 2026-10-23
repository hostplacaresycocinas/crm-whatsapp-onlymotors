'use client';

import { useActionState, useTransition } from 'react';
import Link from 'next/link';
import { fieldClass, primaryButtonClass, secondaryButtonClass } from '@/components/form';
import { VEHICLE_STATUS, type Vehicle } from '@/lib/vehicles';
import { deleteVehicle, saveVehicle } from './actions';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted">{children}</span>;
}

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const [error, action, pending] = useActionState(saveVehicle, null);
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="mt-8 space-y-5 rounded-[26px] bg-surface p-6 ring-1 ring-line">
      <input type="hidden" name="id" value={vehicle?.id ?? ''} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <Label>Marca</Label>
          <input name="brand" required defaultValue={vehicle?.brand} placeholder="Toyota" className={fieldClass} />
        </label>
        <label>
          <Label>Modelo</Label>
          <input name="model" required defaultValue={vehicle?.model} placeholder="Corolla" className={fieldClass} />
        </label>
        <label>
          <Label>Versión</Label>
          <input name="version" defaultValue={vehicle?.version ?? ''} placeholder="XEi 2.0 CVT" className={fieldClass} />
        </label>
        <label>
          <Label>Año</Label>
          <input name="year" inputMode="numeric" defaultValue={vehicle?.year ?? ''} placeholder="2020" className={fieldClass} />
        </label>
        <label>
          <Label>Kilómetros</Label>
          <input name="km" inputMode="numeric" defaultValue={vehicle?.km ?? ''} placeholder="45000" className={fieldClass} />
        </label>
        <label>
          <Label>Condición</Label>
          <select name="condition" defaultValue={vehicle?.condition ?? 'used'} className={fieldClass}>
            <option value="used">Usado</option>
            <option value="new">0 km</option>
          </select>
        </label>
        <label>
          <Label>Precio</Label>
          <input name="price" inputMode="decimal" defaultValue={vehicle?.price ?? ''} placeholder="25000000" className={fieldClass} />
        </label>
        <label>
          <Label>Moneda</Label>
          <select name="currency" defaultValue={vehicle?.currency ?? 'ARS'} className={fieldClass}>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          <Label>Estado</Label>
          <select name="status" defaultValue={vehicle?.status ?? 'available'} className={fieldClass}>
            {VEHICLE_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <Label>Descripción</Label>
        <textarea
          name="description"
          rows={4}
          defaultValue={vehicle?.description ?? ''}
          placeholder="Único dueño, service oficial, cubiertas nuevas."
          className={`${fieldClass} resize-none`}
        />
      </label>

      <label className="block">
        <Label>Fotos (una URL https por línea)</Label>
        <textarea
          name="images"
          rows={3}
          defaultValue={vehicle?.images.join('\n') ?? ''}
          placeholder="https://…/foto-1.jpg"
          className={`${fieldClass} resize-none font-mono text-xs`}
        />
      </label>

      {vehicle?.meta_sync_error && <p className="text-[13px] text-red-700">Catálogo de Meta: {vehicle.meta_sync_error}</p>}
      {error && <p className="text-[13px] text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className={primaryButtonClass}>
          {pending ? 'Guardando…' : 'Guardar y publicar'}
        </button>
        <Link href="/catalog" className={secondaryButtonClass}>
          Cancelar
        </Link>
        {vehicle && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => confirm('¿Borrar este auto del CRM y del catálogo?') && startDelete(() => deleteVehicle(vehicle.id))}
            className="ml-auto rounded-full px-4 py-2 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-40"
          >
            {deleting ? 'Borrando…' : 'Borrar'}
          </button>
        )}
      </div>
    </form>
  );
}
