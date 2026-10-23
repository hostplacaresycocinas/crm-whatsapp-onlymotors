import { after, type NextRequest } from 'next/server';
import { isValidSignature, processWebhook } from '@/lib/whatsapp/webhook';

// Verificación que hace Meta al guardar la URL del webhook.
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get('hub.mode') === 'subscribe' &&
    params.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(params.get('hub.challenge'));
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!isValidSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Meta espera un 200 rápido; el guardado corre después de responder.
  after(() => processWebhook(JSON.parse(rawBody)).catch((err) => console.error('[WA webhook]', err)));

  return new Response('OK');
}
