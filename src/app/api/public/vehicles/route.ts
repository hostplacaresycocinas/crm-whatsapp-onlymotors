import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { vehicleTitle } from '@/lib/vehicles';

// Stock público para el sitio web de la concesionaria. Sin sesión: solo campos publicables y sin vendidos.
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant') ?? '';
  if (!UUID.test(tenant)) return Response.json({ error: 'Falta ?tenant=<id>' }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('vehicles')
    .select('id, brand, model, version, year, km, price, currency, condition, status, description, images, updated_at')
    .eq('tenant_id', tenant)
    .neq('status', 'sold')
    .order('updated_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const vehicles = (data ?? []).map((v) => ({ ...v, title: vehicleTitle(v) }));
  return Response.json(
    { vehicles },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
