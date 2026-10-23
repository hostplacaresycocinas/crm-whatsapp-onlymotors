// Páginas públicas que pide Meta para publicar la app. Sin sesión (ver matcher en proxy.ts).
export default function LegalLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 lg:py-16">
      <article className="space-y-5 rounded-[26px] bg-surface p-6 text-[15px] leading-relaxed text-ink-2 ring-1 ring-line lg:p-10 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-[-0.03em] [&_h1]:text-ink [&_h2]:pt-3 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </article>
    </main>
  );
}
