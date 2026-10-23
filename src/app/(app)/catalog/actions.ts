'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteProduct, getCatalog, listProducts, publishProblem, upsertProducts } from '@/lib/meta/catalog';
import type { Vehicle } from '@/lib/vehicles';

async function tenantContext() {
  const supabase = await createClient();
  // RLS: solo devuelve las membresías del usuario logueado.
  const { data: membership } = await supabase.from('tenant_members').select('tenant_id').limit(1).single();
  if (!membership) throw new Error('Tu usuario no pertenece a ningún tenant.');
  const { data: tenant } = await supabase.from('tenants').select('meta_catalog_id').eq('id', membership.tenant_id).single();
  return { supabase, tenantId: membership.tenant_id as string, catalogId: (tenant?.meta_catalog_id as string | null) ?? null };
}

// Publica en el catálogo de Meta y deja el resultado en el auto, para verlo en la lista.
async function syncToCatalog(catalogId: string, vehicles: Vehicle[]) {
  const admin = createAdminClient();
  const ready = vehicles.filter((v) => !publishProblem(v));
  let errors = new Map<string, string>();
  let batchError: string | null = null;
  if (ready.length) {
    try {
      errors = await upsertProducts(catalogId, ready);
    } catch (err) {
      batchError = err instanceof Error ? err.message : 'Error publicando en Meta';
    }
  }

  const now = new Date().toISOString();
  let failed = 0;
  for (const v of vehicles) {
    const error = publishProblem(v) ?? batchError ?? errors.get(v.retailer_id) ?? null;
    if (error) failed++;
    await admin
      .from('vehicles')
      .update(error ? { meta_sync_error: error } : { meta_sync_error: null, meta_synced_at: now })
      .eq('id', v.id);
  }
  return { published: vehicles.length - failed, failed };
}

function numberOrNull(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return String(value ?? '').trim() && Number.isFinite(n) ? n : null;
}

export async function saveVehicle(_prev: string | null, formData: FormData) {
  let id = String(formData.get('id') ?? '');
  try {
    const { supabase, tenantId, catalogId } = await tenantContext();
    const brand = String(formData.get('brand') ?? '').trim();
    const model = String(formData.get('model') ?? '').trim();
    if (!brand || !model) return 'Completá marca y modelo.';

    const fields = {
      brand,
      model,
      version: String(formData.get('version') ?? '').trim() || null,
      year: numberOrNull(formData.get('year')),
      km: numberOrNull(formData.get('km')),
      price: numberOrNull(formData.get('price')),
      currency: formData.get('currency') === 'USD' ? 'USD' : 'ARS',
      condition: formData.get('condition') === 'new' ? 'new' : 'used',
      status: ['available', 'reserved', 'sold'].includes(String(formData.get('status'))) ? String(formData.get('status')) : 'available',
      description: String(formData.get('description') ?? '').trim() || null,
      images: String(formData.get('images') ?? '')
        .split(/\s+/)
        .filter((u) => /^https:\/\//.test(u)),
      updated_at: new Date().toISOString(),
    };

    const query = id
      ? supabase.from('vehicles').update(fields).eq('id', id)
      : supabase.from('vehicles').insert({ ...fields, tenant_id: tenantId, retailer_id: `om-${crypto.randomUUID().slice(0, 8)}` });
    const { data, error } = await query.select('*').single();
    if (error) return error.message;
    id = data.id;

    if (catalogId) await syncToCatalog(catalogId, [data as Vehicle]);
  } catch (err) {
    return err instanceof Error ? err.message : 'No se pudo guardar';
  }
  revalidatePath('/catalog');
  redirect('/catalog');
}

export async function deleteVehicle(id: string) {
  const { supabase, catalogId } = await tenantContext();
  const { data: v } = await supabase.from('vehicles').select('retailer_id, meta_synced_at').eq('id', id).single();
  if (!v) return;
  if (catalogId && v.meta_synced_at) await deleteProduct(catalogId, v.retailer_id);
  await supabase.from('vehicles').delete().eq('id', id);
  revalidatePath('/catalog');
  redirect('/catalog');
}

export async function publishAll() {
  try {
    const { supabase, catalogId } = await tenantContext();
    if (!catalogId) return { error: 'Primero configurá el catálogo.' };
    const { data } = await supabase.from('vehicles').select('*');
    const result = await syncToCatalog(catalogId, (data ?? []) as Vehicle[]);
    revalidatePath('/catalog');
    return { error: null, message: `Publicados: ${result.published}. Con problemas: ${result.failed}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error publicando' };
  }
}

// "$12,000.00" / "ARS 12.000,00" → 12000: el último separador seguido de 2 dígitos es el decimal.
function parseMetaPrice(price?: string) {
  if (!price) return null;
  const clean = price.replace(/[^\d.,]/g, '');
  const decimal = clean.match(/[.,](\d{2})$/);
  const whole = (decimal ? clean.slice(0, -3) : clean).replace(/[.,]/g, '');
  const n = Number(`${whole}${decimal ? `.${decimal[1]}` : ''}`);
  return Number.isFinite(n) && whole ? n : null;
}

// Trae los productos que están en Meta y no en el CRM. No pisa autos que ya existen.
export async function importFromCatalog() {
  try {
    const { supabase, tenantId, catalogId } = await tenantContext();
    if (!catalogId) return { error: 'Primero configurá el catálogo.' };
    const [products, { data: existing }] = await Promise.all([
      listProducts(catalogId),
      supabase.from('vehicles').select('retailer_id'),
    ]);
    const known = new Set((existing ?? []).map((v) => v.retailer_id));
    const now = new Date().toISOString();
    const rows = products
      .filter((p) => !known.has(p.retailer_id))
      .map((p) => {
        const [first, ...rest] = p.name.split(' ');
        const brand = p.brand || first;
        return {
          tenant_id: tenantId,
          retailer_id: p.retailer_id,
          brand,
          model: (p.brand ? p.name.replace(new RegExp(`^${p.brand}\\s*`, 'i'), '') : rest.join(' ')) || p.name,
          price: parseMetaPrice(p.price),
          currency: p.currency === 'USD' ? 'USD' : 'ARS',
          condition: p.condition === 'new' ? 'new' : 'used',
          status: p.availability === 'out of stock' ? 'sold' : p.availability === 'available for order' ? 'reserved' : 'available',
          description: p.description ?? null,
          images: p.image_url ? [p.image_url] : [],
          meta_synced_at: now,
        };
      });
    if (rows.length) {
      const { error } = await supabase.from('vehicles').insert(rows);
      if (error) return { error: error.message };
    }
    revalidatePath('/catalog');
    return { error: null, message: `Importados: ${rows.length} de ${products.length} productos del catálogo.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error importando' };
  }
}

export async function saveCatalogId(_prev: string | null, formData: FormData) {
  try {
    const { tenantId } = await tenantContext();
    const catalogId = String(formData.get('catalog_id') ?? '').trim();
    if (!/^\d+$/.test(catalogId)) return 'El identificador del catálogo son solo números.';
    await getCatalog(catalogId); // Valida que exista y que el token tenga acceso.
    // tenants no tiene policy de update: se escribe con admin, ya filtrado por el tenant del usuario.
    const { error } = await createAdminClient().from('tenants').update({ meta_catalog_id: catalogId }).eq('id', tenantId);
    if (error) return error.message;
  } catch (err) {
    return err instanceof Error ? err.message : 'No se pudo guardar el catálogo';
  }
  revalidatePath('/catalog');
  return null;
}
