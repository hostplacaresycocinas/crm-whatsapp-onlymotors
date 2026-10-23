import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui';
import { vehicleTitle, type Vehicle } from '@/lib/vehicles';
import { VehicleForm } from '../vehicle-form';

async function EditVehicle({ params }: { params: PageProps<'/catalog/[id]'>['params'] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('vehicles').select('*').eq('id', id).single();
  if (!data) notFound();
  const vehicle = data as Vehicle;

  return (
    <>
      <PageHeader title={vehicleTitle(vehicle)} subtitle="Los cambios se publican en el catálogo de WhatsApp al guardar." />
      <VehicleForm vehicle={vehicle} />
    </>
  );
}

export default function VehiclePage({ params }: PageProps<'/catalog/[id]'>) {
  return (
    <div className="mx-auto max-w-3xl p-5 lg:p-8">
      <Suspense fallback={<Skeleton className="h-96 rounded-[26px]" />}>
        <EditVehicle params={params} />
      </Suspense>
    </div>
  );
}
