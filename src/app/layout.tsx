import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Mono, DM_Sans } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({ variable: '--font-bricolage', subsets: ['latin'] });
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });
const dmMono = DM_Mono({ variable: '--font-dm-mono', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'CRM WhatsApp',
  description: 'Seguimiento de clientes por WhatsApp',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${dmSans.variable} ${dmMono.variable} h-full`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
