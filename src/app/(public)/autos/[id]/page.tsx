import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice, vehicleTitle, type Vehicle } from '@/lib/vehicles';

// Ficha pública de cada auto: es el "link" que pide Meta para cada producto del catálogo.
async function loadVehicle(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient()
    .from('vehicles')
    .select('id, brand, model, version, year, km, price, currency, condition, status, description, images')
    .eq('id', id)
    .single();
  return data as Vehicle | null;
}

export async function generateMetadata({ params }: PageProps<'/autos/[id]'>): Promise<Metadata> {
  const v = await loadVehicle((await params).id);
  return v ? { title: `${vehicleTitle(v)} · Only Motors`, description: v.description ?? undefined } : {};
}

async function VehicleDetail({ params }: { params: PageProps<'/autos/[id]'>['params'] }) {
  const v = await loadVehicle((await params).id);
  if (!v) notFound();
  const title = vehicleTitle(v);

  return (
    <article className="overflow-hidden rounded-[26px] bg-surface ring-1 ring-line">
      {v.images[0] && (
        // eslint-disable-next-line @next/next/no-img-element -- URLs externas arbitrarias
        <img src={v.images[0]} alt={title} className="aspect-[16/10] w-full object-cover" />
      )}
      <div className="space-y-4 p-6 lg:p-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {v.condition === 'new' ? '0 km' : 'Usado'}
            {v.km != null && ` · ${v.km.toLocaleString('es-AR')} km`}
            {v.status === 'sold' && ' · Vendido'}
            {v.status === 'reserved' && ' · Reservado'}
          </p>
        </div>
        <p className="font-display text-2xl font-semibold">{formatPrice(v)}</p>
        {v.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{v.description}</p>}
        {v.images.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {v.images.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element -- URLs externas arbitrarias
              <img key={src} src={src} alt={title} className="aspect-square w-full rounded-2xl object-cover" />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function PublicVehiclePage({ params }: PageProps<'/autos/[id]'>) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[26px] bg-surface" />}>
        <VehicleDetail params={params} />
      </Suspense>
    </main>
  );
}
