'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeCode, getPhoneNumber, requestAppSync, subscribeApp } from '@/lib/whatsapp/onboarding';
import { createTemplate } from '@/lib/whatsapp/templates';

type SignupResult = {
  code: string;
  event: string;
  wabaId: string;
  phoneNumberId: string;
};

const COEXISTENCE_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';

export async function connectWhatsApp(input: SignupResult) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión vencida. Volvé a iniciar sesión.' };

  const tenantId = await currentTenantId();
  if (!tenantId) return { error: 'Tu usuario no pertenece a ningún tenant.' };

  // Solo coexistencia: cualquier otro flujo registra el número para la API y lo saca de la app del celular.
  if (input.event !== COEXISTENCE_EVENT) {
    return { error: `El flujo terminó como "${input.event}" y no como coexistencia. No se guardó nada en el CRM.` };
  }

  try {
    const { token, expiresAt } = await exchangeCode(input.code);
    const phone = await getPhoneNumber(input.phoneNumberId, token);
    await subscribeApp(input.wabaId, token);

    const admin = createAdminClient();
    const { error } = await admin.from('whatsapp_accounts').upsert(
      {
        tenant_id: tenantId,
        waba_id: input.wabaId,
        phone_number_id: input.phoneNumberId,
        display_phone_number: phone.display_phone_number,
        access_token: token,
        access_token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        status: 'connected',
        disconnected_at: null,
        disconnection_info: null,
        history_progress: null,
      },
      { onConflict: 'phone_number_id' }
    );
    if (error) throw new Error(error.message);

    // Si la sincronización falla, la conexión igual queda hecha: se puede reintentar dentro de las 24 h.
    const sync: string[] = [];
    for (const type of ['smb_app_state_sync', 'history'] as const) {
      try {
        console.log('[WA onboarding] sync pedido', type, await requestAppSync(input.phoneNumberId, token, type));
      } catch (err) {
        console.error('[WA onboarding] sync', type, err);
        sync.push(type);
      }
    }

    revalidatePath('/connect');
    return {
      error: null,
      warning: sync.length ? `Conectado, pero falló pedir la sincronización (${sync.join(', ')}).` : null,
    };
  } catch (err) {
    console.error('[WA onboarding]', err);
    return { error: err instanceof Error ? err.message : 'Error conectando el número' };
  }
}

async function currentTenantId() {
  const supabase = await createClient();
  // RLS: solo devuelve las membresías del usuario logueado.
  const { data } = await supabase.from('tenant_members').select('tenant_id').limit(1).single();
  return data?.tenant_id as string | undefined;
}

// Carga manual (número de prueba de Meta o uno ya registrado en la API): no es coexistencia ni pide sincronización.
export async function saveManualAccount(_prev: string | null, formData: FormData) {
  const tenantId = await currentTenantId();
  if (!tenantId) return 'Tu usuario no pertenece a ningún tenant.';

  const phoneNumberId = String(formData.get('phone_number_id') ?? '').trim();
  const wabaId = String(formData.get('waba_id') ?? '').trim();
  const token = String(formData.get('access_token') ?? '').trim();
  if (!phoneNumberId || !wabaId || !token) return 'Completá los tres campos.';

  try {
    const phone = await getPhoneNumber(phoneNumberId, token);
    await subscribeApp(wabaId, token);

    const { error } = await createAdminClient().from('whatsapp_accounts').upsert(
      {
        tenant_id: tenantId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: phone.display_phone_number,
        access_token: token,
        // El token temporal del panel dura 24 h.
        access_token_expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString(),
        connected_at: new Date().toISOString(),
        status: 'connected',
        disconnected_at: null,
        disconnection_info: null,
      },
      { onConflict: 'phone_number_id' }
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    return err instanceof Error ? err.message : 'No se pudo guardar el número';
  }

  revalidatePath('/connect');
  return null;
}

const TEMPLATE_NAME = /^[a-z0-9_]{1,512}$/;

export async function createTemplateAction(_prev: { error: string | null; ok?: string } | null, formData: FormData) {
  const tenantId = await currentTenantId();
  if (!tenantId) return { error: 'Tu usuario no pertenece a ningún tenant.' };

  const accountId = String(formData.get('account_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const category = formData.get('category') === 'MARKETING' ? 'MARKETING' : 'UTILITY';
  const body = String(formData.get('body') ?? '').trim();
  if (!TEMPLATE_NAME.test(name)) return { error: 'El nombre va en minúsculas, sin espacios ni acentos (ej: aviso_turno).' };
  if (!body) return { error: 'Escribí el texto de la plantilla.' };

  // Filtrar por tenant: el id de la cuenta llega del cliente.
  const { data: account } = await createAdminClient()
    .from('whatsapp_accounts')
    .select('waba_id, access_token')
    .eq('id', accountId)
    .eq('tenant_id', tenantId)
    .single();
  if (!account?.waba_id || !account.access_token) return { error: 'Ese número no tiene token cargado.' };

  try {
    const created = await createTemplate(account.waba_id, account.access_token, { name, category, language: 'es_AR', body });
    revalidatePath('/connect');
    return { error: null, ok: `Plantilla "${name}" creada (${created.status}).` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'No se pudo crear la plantilla' };
  }
}
