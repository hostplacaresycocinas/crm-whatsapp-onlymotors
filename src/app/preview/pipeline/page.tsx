import { RailNav } from '@/components/rail';
import { PageHeader } from '@/components/page-header';
import { Board } from '../../(app)/pipeline/board';
import { contacts } from '../mock';

export default function PreviewPipeline() {
  return (
    <div className="min-h-screen pl-[68px]">
      <RailNav pathname="/pipeline" />
      <div className="p-5 lg:p-8">
        <PageHeader title="Pipeline" subtitle="Arrastrá cada contacto a la etapa en la que está." />
        <Board initial={contacts} />
      </div>
    </div>
  );
}
