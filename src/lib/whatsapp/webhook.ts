import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

type WaMessage = {
  id: string;
  from: string;
  to?: string;
  timestamp: string;
  type: string;
  [key: string]: unknown;
};

type HistoryChunk = {
  metadata?: { phase: number; chunk_order: number; progress: number };
  threads?: { id: string; messages?: WaMessage[] }[];
  errors?: { code: number; title?: string; message?: string }[];
};

type StateSyncItem = {
  type: string;
  action: 'add' | 'remove';
  contact?: { full_name?: string; first_name?: string; phone_number: string };
};

type ChangeValue = {
  metadata?: { phone_number_id: string };
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
  message_echoes?: WaMessage[];
  statuses?: { id: string; status: string }[];
  history?: HistoryChunk[];
  state_sync?: StateSyncItem[];
  event?: string;
  disconnection_info?: Record<string, unknown>;
};

type WebhookPayload = {
  entry?: { id: string; changes?: { field: string; value: ChangeValue }[] }[];
};

type Db = ReturnType<typeof createAdminClient>;

export function isValidSignature(rawBody: string, header: string | null) {
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', process.env.META_APP_SECRET!).update(rawBody).digest('hex');
  const a = Buffer.from(header.slice(7), 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function extractContent(m: WaMessage) {
  const content = m[m.type] as { body?: string; caption?: string; id?: string; filename?: string } | undefined;
  return {
    body: content?.body ?? content?.caption ?? content?.filename ?? null,
    mediaId: content?.id ?? null,
  };
}

function toIso(timestamp: string) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

export async function processWebhook(payload: WebhookPayload) {
  const db = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const { field, value } of entry.changes ?? []) {
      // account_update no trae metadata: se identifica por el WABA (entry.id)
      if (field === 'account_update') {
        await handleAccountUpdate(db, entry.id, value);
        continue;
      }

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      if (field === 'history') await handleHistory(db, phoneNumberId, value.history ?? []);
      else if (field === 'smb_app_state_sync') await handleStateSync(db, phoneNumberId, value.state_sync ?? []);
      else if (field === 'messages' || field === 'smb_message_echoes') await handleMessages(db, phoneNumberId, field, value);
      else console.log('[WA webhook] campo sin manejar:', field);
    }
  }
}

// messages: entrantes del cliente + estados de lo que enviamos por API
// smb_message_echoes: lo que se envía desde la app del celular (coexistencia)
async function handleMessages(db: Db, phoneNumberId: string, field: string, value: ChangeValue) {
  const isEcho = field === 'smb_message_echoes';
  const list = isEcho ? value.message_echoes : value.messages;
  const names = new Map(value.contacts?.map((c) => [c.wa_id, c.profile?.name ?? null]));

  for (const m of list ?? []) {
    const waId = isEcho ? m.to! : m.from;
    const { body, mediaId } = extractContent(m);
    const { error } = await db.rpc('ingest_message', {
      p_phone_number_id: phoneNumberId,
      p_wa_id: waId,
      p_name: names.get(waId) ?? null,
      p_wa_message_id: m.id,
      p_direction: isEcho ? 'out' : 'in',
      p_source: isEcho ? 'app' : 'customer',
      p_type: m.type,
      p_body: body,
      p_media_id: mediaId,
      p_sent_at: toIso(m.timestamp),
      p_raw: m,
    });
    if (error) console.error('[WA webhook] ingest', error);
  }

  for (const s of value.statuses ?? []) {
    await db.from('messages').update({ status: s.status }).eq('wa_message_id', s.id);
  }
}

// history: chats de los 180 días previos al onboarding, en chunks que pueden llegar desordenados.
// thread.id es el cliente; si el mensaje no viene de él, lo mandó el negocio desde la app.
async function handleHistory(db: Db, phoneNumberId: string, chunks: HistoryChunk[]) {
  for (const chunk of chunks) {
    for (const e of chunk.errors ?? []) {
      // 2593109: el negocio no aceptó compartir el historial
      console.warn('[WA webhook] history', e.code, e.message ?? e.title);
    }

    for (const thread of chunk.threads ?? []) {
      for (const m of thread.messages ?? []) {
        const inbound = m.from === thread.id;
        const { body, mediaId } = extractContent(m);
        const { error } = await db.rpc('ingest_message', {
          p_phone_number_id: phoneNumberId,
          p_wa_id: thread.id,
          p_name: null,
          p_wa_message_id: m.id,
          p_direction: inbound ? 'in' : 'out',
          p_source: inbound ? 'customer' : 'app',
          p_type: m.type,
          p_body: body,
          p_media_id: mediaId,
          p_sent_at: toIso(m.timestamp),
          p_raw: m,
          p_is_history: true,
        });
        if (error) console.error('[WA webhook] history ingest', error);
      }
    }

    const progress = chunk.metadata?.progress;
    if (progress != null) {
      await db
        .from('whatsapp_accounts')
        .update({ history_progress: progress })
        .eq('phone_number_id', phoneNumberId)
        .or(`history_progress.is.null,history_progress.lt.${progress}`);
    }
  }
}

// smb_app_state_sync: contactos guardados en la app del celular.
// Un "remove" no borra el contacto del CRM: puede tener notas, etapa y mensajes.
async function handleStateSync(db: Db, phoneNumberId: string, items: StateSyncItem[]) {
  const { data: account } = await db
    .from('whatsapp_accounts')
    .select('tenant_id')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();
  if (!account) return;

  for (const item of items) {
    if (item.type !== 'contact' || item.action !== 'add' || !item.contact) continue;
    const waId = item.contact.phone_number.replace(/\D/g, '');
    const name = item.contact.full_name || item.contact.first_name;
    if (!waId || !name) continue;

    const { error } = await db
      .from('contacts')
      .upsert({ tenant_id: account.tenant_id, wa_id: waId, name }, { onConflict: 'tenant_id,wa_id' });
    if (error) console.error('[WA webhook] state sync', error);
  }
}

// account_update: PARTNER_REMOVED (desconectado desde la app) o ACCOUNT_OFFBOARDED (cambio de equipo / re-registro).
async function handleAccountUpdate(db: Db, wabaId: string, value: ChangeValue) {
  if (value.event !== 'PARTNER_REMOVED' && value.event !== 'ACCOUNT_OFFBOARDED') {
    console.log('[WA webhook] account_update:', value.event);
    return;
  }

  const { error } = await db
    .from('whatsapp_accounts')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
      disconnection_info: value.disconnection_info ?? { event: value.event },
    })
    .eq('waba_id', wabaId);
  if (error) console.error('[WA webhook] account_update', error);
  else console.warn('[WA webhook] número desconectado', wabaId, value.event);
}
