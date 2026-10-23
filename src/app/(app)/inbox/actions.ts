'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendText } from '@/lib/whatsapp/send';
import { isWindowOpen, type Stage } from '@/lib/types';

export async function updateContact(contactId: string, patch: { stage?: Stage; follow_up_at?: string | null }) {
  // Los argumentos de una server action llegan del cliente: copiar solo los campos permitidos.
  const safe: Record<string, unknown> = {};
  if (patch.stage !== undefined) safe.stage = patch.stage;
  if (patch.follow_up_at !== undefined) safe.follow_up_at = patch.follow_up_at;

  const supabase = await createClient();
  const { error } = await supabase.from('contacts').update(safe).eq('id', contactId);
  if (error) throw new Error(error.message);
}

export async function markRead(contactId: string) {
  const supabase = await createClient();
  await supabase.from('contacts').update({ unread_count: 0 }).eq('id', contactId);
}

export async function addNote(contactId: string, body: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: contact } = await supabase.from('contacts').select('tenant_id').eq('id', contactId).single();
  if (!user || !contact || !body.trim()) return;

  await supabase.from('notes').insert({
    tenant_id: contact.tenant_id,
    contact_id: contactId,
    author_id: user.id,
    body: body.trim(),
  });
  revalidatePath(`/inbox/${contactId}`);
}

export async function sendMessage(contactId: string, body: string) {
  // Leer con el cliente del usuario: si no es miembro del tenant, RLS no devuelve nada.
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from('contacts')
    .select('tenant_id, wa_id, last_inbound_at')
    .eq('id', contactId)
    .single();

  if (!contact) return { error: 'Contacto no encontrado' };
  if (!isWindowOpen(contact.last_inbound_at)) {
    return { error: 'Pasaron más de 24 h desde su último mensaje. Escribile desde el celular.' };
  }

  // MVP: un número por tenant.
  const admin = createAdminClient();
  const { data: account } = await admin
    .from('whatsapp_accounts')
    .select('phone_number_id, access_token')
    .eq('tenant_id', contact.tenant_id)
    .limit(1)
    .single();

  if (!account?.access_token) return { error: 'No hay un número de WhatsApp conectado' };

  try {
    const waMessageId = await sendText(account.phone_number_id, account.access_token, contact.wa_id, body);
    await admin.rpc('ingest_message', {
      p_phone_number_id: account.phone_number_id,
      p_wa_id: contact.wa_id,
      p_name: null,
      p_wa_message_id: waMessageId,
      p_direction: 'out',
      p_source: 'api',
      p_type: 'text',
      p_body: body,
      p_media_id: null,
      p_sent_at: new Date().toISOString(),
      p_raw: null,
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error enviando mensaje' };
  }
}
