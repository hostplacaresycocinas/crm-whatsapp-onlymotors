import { notFound } from 'next/navigation';

// Vista del diseño con datos de ejemplo (src/app/preview/mock.ts). Solo en desarrollo.
export default function PreviewLayout({ children }: LayoutProps<'/preview'>) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
