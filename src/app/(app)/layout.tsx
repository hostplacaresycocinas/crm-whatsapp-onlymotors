import { Suspense } from 'react';
import { Rail, RailNav } from '@/components/rail';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-screen pl-[68px]">
      <Suspense fallback={<RailNav pathname="" />}>
        <Rail />
      </Suspense>
      {children}
    </div>
  );
}
