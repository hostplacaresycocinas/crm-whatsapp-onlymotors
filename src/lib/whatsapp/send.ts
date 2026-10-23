import 'server-only';

export const GRAPH_VERSION = 'v23.0';

// Mensaje de texto libre. Gratis, pero solo dentro de las 24 h desde el último mensaje del cliente.
export async function sendText(phoneNumberId: string, accessToken: string, to: string, body: string) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Error enviando mensaje');
  return data.messages[0].id as string;
}
