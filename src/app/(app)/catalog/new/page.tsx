import { PageHeader } from '@/components/page-header';
import { VehicleForm } from '../vehicle-form';

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-3xl p-5 lg:p-8">
      <PageHeader title="Nuevo auto" subtitle="Al guardarlo se publica en el catálogo de WhatsApp." />
      <VehicleForm />
    </div>
  );
}
