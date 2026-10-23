'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Columns3, LayoutGrid, LogOut, MessageCircle } from 'lucide-react';
import { signOut } from '@/app/login/actions';

const NAV = [
  { href: '/', label: 'Panel', icon: LayoutGrid },
  { href: '/inbox', label: 'Conversaciones', icon: MessageCircle },
  { href: '/pipeline', label: 'Pipeline', icon: Columns3 },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function Rail() {
  return <RailNav pathname={usePathname()} />;
}

// Sin hook: sirve de fallback estático mientras se resuelve la URL.
export function RailNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed left-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-ink p-1.5 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.45)]">
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-white font-display text-sm font-bold tracking-tight text-ink">
        OM
      </span>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} aria-label={label} className="group relative flex size-10 items-center justify-center rounded-full">
            {active && (
              <motion.span
                layoutId="rail-active"
                className="absolute inset-0 rounded-full bg-white/15"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <Icon className={`relative size-[18px] transition-colors ${active ? 'text-white' : 'text-white/45 group-hover:text-white'}`} strokeWidth={1.75} />
            <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs text-white opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
              {label}
            </span>
          </Link>
        );
      })}

      <form action={signOut} className="mt-1">
        <button aria-label="Salir" className="flex size-10 items-center justify-center rounded-full text-white/45 transition-colors hover:text-white">
          <LogOut className="size-[18px]" strokeWidth={1.75} />
        </button>
      </form>
    </nav>
  );
}
