import { RailNav } from '@/components/rail';
import { PageHeader } from '@/components/page-header';
import { Panel } from '../(app)/panel';
import { stats } from './mock';

export default function PreviewPanel() {
  return (
    <div className="min-h-screen pl-[68px]">
      <RailNav pathname="/" />
      <div className="mx-auto max-w-[1400px] p-5 lg:p-8">
        <PageHeader title="Panel" subtitle="Cómo vienen tus conversaciones y seguimientos." />
        <Panel stats={stats} />
      </div>
    </div>
  );
}
