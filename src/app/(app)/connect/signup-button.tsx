'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useTransition } from 'react';
import { connectWhatsApp } from './actions';

type SessionInfo = { event: string; wabaId: string; phoneNumberId: string };

type FBLoginResponse = { authResponse?: { code?: string } | null };

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init(params: Record<string, unknown>): void;
      login(cb: (res: FBLoginResponse) => void, options: Record<string, unknown>): void;
    };
  }
}

export function SignupButton() {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const session = useRef<SessionInfo | null>(null);

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v23.0',
      });
      setReady(true);
    };
    if (window.FB) window.fbAsyncInit();

    // Meta avisa por postMessage qué cuenta y número se eligieron, y si fue coexistencia.
    function onMessage(event: MessageEvent) {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (data.event === 'CANCEL') {
          session.current = null;
          setStatus({ tone: 'warn', text: 'Se cerró el flujo sin conectar. No cambió nada.' });
          return;
        }
        session.current = { event: data.event, wabaId: data.data?.waba_id, phoneNumberId: data.data?.phone_number_id };
      } catch {
        // Otros mensajes del SDK no son JSON.
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function launch() {
    setStatus(null);
    session.current = null;
    window.FB!.login(
      (res) => {
        const code = res.authResponse?.code;
        if (!code) return;
        // El postMessage con la sesión suele llegar antes que este callback; si no, esperar un poco.
        const started = Date.now();
        const finish = () => {
          const info = session.current;
          if (!info && Date.now() - started < 3000) return void setTimeout(finish, 200);
          if (!info?.wabaId || !info.phoneNumberId) {
            setStatus({ tone: 'error', text: 'Meta no devolvió la cuenta ni el número elegidos.' });
            return;
          }
          startTransition(async () => {
            const result = await connectWhatsApp({ code, ...info });
            if (result.error) setStatus({ tone: 'error', text: result.error });
            else if (result.warning) setStatus({ tone: 'warn', text: result.warning });
            else setStatus({ tone: 'ok', text: 'Número conectado. Los contactos y el historial van a ir llegando en los próximos minutos.' });
          });
        };
        finish();
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_ES_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      }
    );
  }

  const tones = { ok: 'bg-emerald-50 text-emerald-800', warn: 'bg-amber-50 text-amber-800', error: 'bg-red-50 text-red-800' };

  return (
    <div className="space-y-3">
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" crossOrigin="anonymous" />
      <button
        onClick={launch}
        disabled={!ready || pending}
        className="rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-40"
      >
        {pending ? 'Conectando…' : ready ? 'Conectar mi WhatsApp Business' : 'Cargando…'}
      </button>
      {status && <p className={`rounded-2xl px-4 py-3 text-sm ${tones[status.tone]}`}>{status.text}</p>}
    </div>
  );
}
