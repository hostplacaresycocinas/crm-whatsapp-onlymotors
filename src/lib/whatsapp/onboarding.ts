import 'server-only';
import { graph } from '@/lib/meta/graph';

// El code del Embedded Signup vence a los 30 s: canjearlo apenas llega.
export async function exchangeCode(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    code,
  });
  const data = await graph<{ access_token: string; expires_in?: number }>(`/oauth/access_token?${params}`);
  return {
    token: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
  };
}

export async function getPhoneNumber(phoneNumberId: string, token: string) {
  return graph<{ display_phone_number: string; verified_name?: string }>(
    `/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { token }
  );
}

// Sin esto Meta no manda los webhooks de esa WABA a nuestra app.
export async function subscribeApp(wabaId: string, token: string) {
  await graph(`/${wabaId}/subscribed_apps`, { method: 'POST', token });
}

// Coexistencia: contactos e historial se piden una sola vez y dentro de las 24 h del onboarding.
// Llegan después por los webhooks smb_app_state_sync e history.
export async function requestAppSync(phoneNumberId: string, token: string, syncType: 'smb_app_state_sync' | 'history') {
  const data = await graph<{ request_id: string }>(`/${phoneNumberId}/smb_app_data`, {
    method: 'POST',
    token,
    body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: syncType }),
  });
  return data.request_id;
}
