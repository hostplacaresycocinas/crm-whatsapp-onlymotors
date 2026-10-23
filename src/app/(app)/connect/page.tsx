import { Suspense } from 'react';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatShortDate } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui';
import { listTemplates, type Template } from '@/lib/whatsapp/templates';
import { SignupButton } from './signup-button';
import { ManualAccountForm } from './manual-account-form';
import { TemplateForm } from './template-form';

const WARN_BEFORE_MS = 7 * 86_400_000;

async function loadAccounts() {
  // El vencimiento del token se compara con Date.now(): renderizar por request.
  await connection();
  const supabase = await createClient();
  const { data: membership } = await supabase.from('tenant_members').select('tenant_id').limit(1).single();
  if (!membership) return null;

  // whatsapp_accounts no tiene policies (guarda el token): leer con admin, filtrando por el tenant del usuario.
  const { data: accounts } = await createAdminClient()
    .from('whatsapp_accounts')
    .select('id, display_phone_number, phone_number_id, status, access_token_expires_at, history_progress, connected_at')
    .eq('tenant_id', membership.tenant_id)
    .order('created_at');

  const now = Date.now();
  return (accounts ?? []).map((a) => {
    const expires = a.access_token_expires_at ? new Date(a.access_token_expires_at) : null;
    return { ...a, expires, expiringSoon: !!expires && expires.getTime() - now < WARN_BEFORE_MS };
  });
}

async function Accounts() {
  const accounts = await loadAccounts();
  if (!accounts?.length) return <p className="text-sm text-muted">Todavía no hay números conectados.</p>;

  return (
    <ul className="divide-y divide-line">
      {accounts.map(({ expires, expiringSoon, ...a }) => {
        return (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-medium">{a.display_phone_number ?? a.phone_number_id}</p>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {a.history_progress != null ? `Historial ${a.history_progress}%` : 'Sin historial'}
                {expires && ` · token vence ${formatShortDate(expires)}`}
              </p>
            </div>
            <div className="flex gap-2">
              {expiringSoon && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">Renovar token</span>}
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  a.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {a.status === 'connected' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const TEMPLATE_STATUS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-800',
};

async function Templates() {
  await connection();
  const supabase = await createClient();
  const { data: membership } = await supabase.from('tenant_members').select('tenant_id').limit(1).single();
  if (!membership) return null;

  const { data: accounts } = await createAdminClient()
    .from('whatsapp_accounts')
    .select('id, waba_id, display_phone_number, phone_number_id, access_token')
    .eq('tenant_id', membership.tenant_id)
    .eq('status', 'connected')
    .not('access_token', 'is', null);

  if (!accounts?.length) {
    return <p className="text-sm text-muted">Conectá o cargá un número con token para crear plantillas.</p>;
  }

  // Si el token venció, Meta rechaza la lista: mostrar el error en vez de romper la página.
  const lists = await Promise.all(
    accounts.map(async (a) => {
      try {
        return { account: a, templates: await listTemplates(a.waba_id!, a.access_token!), error: null };
      } catch (err) {
        return { account: a, templates: [] as Template[], error: err instanceof Error ? err.message : 'Error' };
      }
    })
  );

  return (
    <div className="space-y-5">
      <TemplateForm accounts={accounts.map((a) => ({ id: a.id, label: a.display_phone_number ?? a.phone_number_id }))} />
      {lists.map(({ account, templates, error }) => (
        <div key={account.id}>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            {account.display_phone_number ?? account.phone_number_id}
          </p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <ul className="divide-y divide-line">
            {templates.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm">{t.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{t.components?.find((c) => c.type === 'BODY')?.text}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${TEMPLATE_STATUS[t.status] ?? 'bg-soft text-ink-2'}`}>
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-3xl p-5 lg:p-8">
      <PageHeader title="WhatsApp" subtitle="Conectá el número de WhatsApp Business que ya usás en el celular." />

      <section className="mt-8 space-y-5 rounded-[26px] bg-surface p-6 ring-1 ring-line">
        <div className="space-y-2 text-sm text-ink-2">
          <p className="font-medium text-ink">Antes de conectar</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              En la ventana de Meta elegí <strong>conectar una cuenta existente de WhatsApp Business</strong>. Si esa opción no
              aparece, cerrá la ventana: cualquier otra opción saca el número de la app del celular.
            </li>
            <li>Tené el celular a mano con WhatsApp Business actualizado (2.24.17 o superior) y aceptá compartir el historial.</li>
            <li>Después de conectar, dejá la app abierta unos minutos mientras se sincronizan los chats.</li>
            <li>Se desactivan los mensajes temporales, ver una vez y las listas de difusión nuevas, y se desvinculan los dispositivos.</li>
          </ul>
        </div>
        <SignupButton />
      </section>

      <section className="mt-3 rounded-[26px] bg-surface p-6 ring-1 ring-line">
        <p className="mb-2 font-medium">Números</p>
        <Suspense fallback={<Skeleton className="h-16 rounded-2xl" />}>
          <Accounts />
        </Suspense>
      </section>

      <section className="mt-3 rounded-[26px] bg-surface p-6 ring-1 ring-line">
        <p className="font-medium">Plantillas de mensaje</p>
        <p className="mb-4 mt-1 text-sm text-muted">
          Para escribirle a un cliente después de las 24 h. Meta revisa cada plantilla antes de habilitarla.
        </p>
        <Suspense fallback={<Skeleton className="h-24 rounded-2xl" />}>
          <Templates />
        </Suspense>
      </section>

      <details className="mt-3 rounded-[26px] bg-surface p-6 ring-1 ring-line">
        <summary className="cursor-pointer font-medium">Cargar un número a mano</summary>
        <p className="mb-4 mt-2 text-sm text-muted">
          Solo para el número de prueba de Meta (Paso 1. Pruébalo). Nunca cargues acá tu número de WhatsApp Business: se
          conecta con el botón de arriba.
        </p>
        <ManualAccountForm />
      </details>
    </div>
  );
}
