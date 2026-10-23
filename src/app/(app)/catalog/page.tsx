import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui';
import { VEHICLE_STATUS, formatPrice, vehicleTitle, type Vehicle } from '@/lib/vehicles';
import { CatalogToolbar } from './catalog-toolbar';
import { CatalogSettings } from './catalog-settings';

async function CatalogData() {
  const supabase = await createClient();
  const [{ data: tenant }, { data: vehicles }] = await Promise.all([
    supabase.from('tenants').select('id, meta_catalog_id').limit(1).single(),
    supabase.from('vehicles').select('*').order('updated_at', { ascending: false }),
  ]);
  const list = (vehicles ?? []) as Vehicle[];
  const catalogId = (tenant?.meta_catalog_id as string | null) ?? null;

  return (
    <>
      <section className="mt-8 rounded-[26px] bg-surface p-6 ring-1 ring-line">
        <p className="font-medium">Catálogo de Meta</p>
        <p className="mb-4 mt-1 text-sm text-muted">
          {catalogId
            ? 'Los autos se publican en este catálogo al guardarlos. Conectalo a WhatsApp desde WhatsApp Manager → Catálogo.'
            : 'Creá un catálogo de comercio electrónico en Commerce Manager y pegá acá su identificador.'}
        </p>
        <CatalogSettings catalogId={catalogId} />
        {tenant && (
          <p className="mt-4 font-mono text-xs text-muted">
            Para el sitio web: /api/public/vehicles?tenant={tenant.id}
          </p>
        )}
      </section>

      <div className="mt-6">
        <CatalogToolbar hasCatalog={!!catalogId} />
      </div>

      {list.length === 0 ? (
        <p className="hatch mt-6 rounded-[26px] p-10 text-center text-sm text-ink-2 ring-1 ring-line">
          Todavía no cargaste autos.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const status = VEHICLE_STATUS.find((s) => s.value === v.status)!;
            return (
              <li key={v.id}>
                <Link
                  href={`/catalog/${v.id}`}
                  className="block overflow-hidden rounded-[26px] bg-surface ring-1 ring-line transition hover:ring-ink"
                >
                  <div className="aspect-[16/10] bg-soft">
                    {v.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element -- URLs externas arbitrarias
                      <img src={v.images[0]} alt={vehicleTitle(v)} className="size-full object-cover" />
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{vehicleTitle(v)}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="font-display text-lg font-semibold">{formatPrice(v)}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {v.km != null && `${v.km.toLocaleString('es-AR')} km · `}
                      {v.meta_sync_error ? (
                        <span className="text-red-700">{v.meta_sync_error}</span>
                      ) : v.meta_synced_at ? (
                        'Publicado en WhatsApp'
                      ) : (
                        'Sin publicar'
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function CatalogPage() {
  return (
    <div className="mx-auto max-w-[1400px] p-5 lg:p-8">
      <PageHeader title="Catálogo" subtitle="Tu stock de autos: se publica en WhatsApp y lo puede leer el sitio web." />
      <Suspense fallback={<Skeleton className="mt-8 h-64 rounded-[26px]" />}>
        <CatalogData />
      </Suspense>
    </div>
  );
}
