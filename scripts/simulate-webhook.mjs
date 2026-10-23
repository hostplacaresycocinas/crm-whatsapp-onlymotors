// Simula los webhooks de Meta contra el server local, firmados con META_APP_SECRET.
// Uso: node --env-file=.env.local scripts/simulate-webhook.mjs [url] [--disconnect]
// Requiere una fila en whatsapp_accounts con phone_number_id = SIM_PHONE_ID y waba_id = SIM_WABA.
import { createHmac } from 'node:crypto';

const url = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:3000/api/whatsapp/webhook';
const disconnect = process.argv.includes('--disconnect');

const PHONE_ID = 'SIM_PHONE_ID';
const WABA = 'SIM_WABA';
const BUSINESS = '5491100000000';
const JUAN = '5491111111111';
const MARIA = '5491122222222';

const ts = (minutesAgo) => String(Math.floor(Date.now() / 1000) - minutesAgo * 60);
const metadata = { display_phone_number: BUSINESS, phone_number_id: PHONE_ID };
const text = (body) => ({ type: 'text', text: { body } });
const payload = (field, value) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: WABA, changes: [{ field, value: { messaging_product: 'whatsapp', ...value } }] }],
});

const events = [
  ['history (3 días atrás)', payload('history', {
    metadata,
    history: [{
      metadata: { phase: 0, chunk_order: 1, progress: 100 },
      threads: [{
        id: JUAN,
        messages: [
          { from: JUAN, id: 'sim.hist.1', timestamp: ts(4320), ...text('Hola, ¿sigue disponible el Corolla 2020?'), history_context: { status: 'READ' } },
          { from: BUSINESS, to: JUAN, id: 'sim.hist.2', timestamp: ts(4310), ...text('¡Hola Juan! Sí, está disponible. ¿Querés venir a verlo?') },
          { from: JUAN, id: 'sim.hist.3', timestamp: ts(4300), ...text('Dale, paso el sábado.'), history_context: { status: 'READ' } },
        ],
      }],
    }],
  })],
  ['smb_app_state_sync (agenda)', payload('smb_app_state_sync', {
    metadata,
    state_sync: [
      { type: 'contact', action: 'add', contact: { full_name: 'Juan Pérez', first_name: 'Juan', phone_number: `+${JUAN}` }, metadata: { timestamp: ts(0) } },
      { type: 'contact', action: 'add', contact: { full_name: 'María Gómez', first_name: 'María', phone_number: `+${MARIA}` }, metadata: { timestamp: ts(0) } },
    ],
  })],
  ['messages (María escribe)', payload('messages', {
    metadata,
    contacts: [{ wa_id: MARIA, profile: { name: 'Mari' } }],
    messages: [{ from: MARIA, id: 'sim.live.1', timestamp: ts(2), ...text('Hola, quiero cotizar la Hilux 0km') }],
  })],
  ['messages (reintento duplicado de Meta)', payload('messages', {
    metadata,
    contacts: [{ wa_id: MARIA, profile: { name: 'Mari' } }],
    messages: [{ from: MARIA, id: 'sim.live.1', timestamp: ts(2), ...text('Hola, quiero cotizar la Hilux 0km') }],
  })],
  ['smb_message_echoes (respuesta desde el celular)', payload('smb_message_echoes', {
    metadata,
    message_echoes: [{ from: BUSINESS, to: MARIA, id: 'sim.echo.1', timestamp: ts(1), ...text('¡Hola María! Te paso la cotización en un rato.') }],
  })],
  ['messages (María manda foto)', payload('messages', {
    metadata,
    contacts: [{ wa_id: MARIA, profile: { name: 'Mari' } }],
    messages: [{ from: MARIA, id: 'sim.live.2', timestamp: ts(0), type: 'image', image: { id: 'sim-media-1', caption: 'Esta es la que vi' } }],
  })],
];

if (disconnect) {
  events.push(['account_update (PARTNER_REMOVED)', {
    object: 'whatsapp_business_account',
    entry: [{ id: WABA, time: Number(ts(0)), changes: [{ field: 'account_update', value: {
      phone_number: BUSINESS, event: 'PARTNER_REMOVED', disconnection_info: { reason: 'SIMULATED', initiated_by: 'USER' },
    } }] }],
  }]);
}

async function post(body, secret = process.env.META_APP_SECRET) {
  const raw = JSON.stringify(body);
  const sig = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': sig }, body: raw });
  return res.status;
}

const verify = await fetch(`${url}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(process.env.WHATSAPP_VERIFY_TOKEN)}&hub.challenge=sim123`);
console.log(`GET verificación → ${verify.status} ${await verify.text()}`);
console.log(`POST firma inválida → ${await post(events[0][1], 'wrong-secret')} (esperado 401)`);

for (const [label, body] of events) {
  console.log(`POST ${label} → ${await post(body)}`);
  // El webhook procesa en after(): esperar para que el orden de llegada sea el real.
  await new Promise((r) => setTimeout(r, 1500));
}
