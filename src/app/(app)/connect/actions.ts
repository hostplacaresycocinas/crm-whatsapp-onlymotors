'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeCode, getPhoneNumber, requestAppSync, subscribeApp } from '@/lib/whatsapp/onboarding';

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

  // RLS: solo devuelve las membresías del usuario logueado.
  const { data: membership } = await supabase.from('tenant_members').select('tenant_id').limit(1).single();
  if (!membership) return { error: 'Tu usuario no pertenece a ningún tenant.' };

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
        tenant_id: membership.tenant_id,
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
