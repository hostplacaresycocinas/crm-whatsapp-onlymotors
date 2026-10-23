'use client';

import { useActionState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { EASE } from '@/components/ui';
import { signIn } from './actions';

const field =
  'w-full rounded-full bg-soft px-5 py-3 text-sm outline-none ring-1 ring-line transition placeholder:text-muted focus:bg-surface focus:ring-ink';

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="hatch pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,transparent_20%,black_75%)]" />
      <motion.form
        action={action}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative w-full max-w-sm rounded-[32px] bg-surface p-8 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.35)] ring-1 ring-line"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-ink font-display text-base font-bold text-white">OM</span>
        <h1 className="mt-6 font-display text-[30px] font-semibold leading-none tracking-[-0.03em]">Hola de nuevo</h1>
        <p className="mt-2 text-sm text-muted">Ingresá para ver tus conversaciones.</p>

        <div className="mt-7 space-y-2.5">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className={field} />
          <input name="password" type="password" required placeholder="Contraseña" autoComplete="current-password" className={field} />
        </div>

        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 px-2 text-[13px] text-ink">
            {error}
          </motion.p>
        )}

        <button
          disabled={pending}
          className="group mt-6 flex w-full items-center justify-between rounded-full bg-ink py-1.5 pl-6 pr-1.5 text-sm font-medium text-white transition hover:bg-ink-2 disabled:opacity-60"
        >
          {pending ? 'Ingresando…' : 'Ingresar'}
          <span className="flex size-9 items-center justify-center rounded-full bg-white text-ink transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="size-4" strokeWidth={2} />
          </span>
        </button>
      </motion.form>
    </main>
  );
}
