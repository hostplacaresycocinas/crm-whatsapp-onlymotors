'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

export const EASE = [0.16, 1, 0.3, 1] as const;

// Entrada escalonada para grillas de tarjetas.
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = (v: number) => Math.round(v).toLocaleString('es-AR');
    if (reduced) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => (node.textContent = format(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      0
    </span>
  );
}

export function Avatar({ label, dark = false, size = 'md' }: { label: string; dark?: boolean; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'size-16 text-lg' : 'size-10 text-xs';
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-mono font-medium tracking-wide ${dims} ${
        dark ? 'bg-ink text-white' : 'bg-soft text-ink-2 ring-1 ring-line'
      }`}
    >
      {label}
    </span>
  );
}

export function LiveDot({ label = 'En vivo' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-2 ring-1 ring-line">
      <span className="relative flex size-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-ink opacity-40" />
        <span className="relative size-1.5 rounded-full bg-ink" />
      </span>
      {label}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[0.05] ${className}`} />;
}
