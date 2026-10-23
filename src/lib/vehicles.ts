export type VehicleStatus = 'available' | 'reserved' | 'sold';

export type Vehicle = {
  id: string;
  tenant_id: string;
  retailer_id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number | null;
  km: number | null;
  price: number | null;
  currency: string;
  condition: 'new' | 'used';
  status: VehicleStatus;
  description: string | null;
  images: string[];
  meta_synced_at: string | null;
  meta_sync_error: string | null;
  updated_at: string;
};

export const VEHICLE_STATUS: { value: VehicleStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Disponible', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'reserved', label: 'Reservado', color: 'bg-amber-100 text-amber-800' },
  { value: 'sold', label: 'Vendido', color: 'bg-zinc-200 text-zinc-700' },
];

export function vehicleTitle(v: Pick<Vehicle, 'brand' | 'model' | 'version' | 'year'>) {
  return [v.brand, v.model, v.version, v.year].filter(Boolean).join(' ');
}

export function formatPrice(v: Pick<Vehicle, 'price' | 'currency'>) {
  if (v.price == null) return 'Consultar';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: v.currency, maximumFractionDigits: 0 }).format(v.price);
}
