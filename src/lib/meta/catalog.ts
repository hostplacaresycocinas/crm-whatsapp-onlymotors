import 'server-only';
import { graph } from './graph';
import { vehicleTitle, type Vehicle } from '@/lib/vehicles';

// Token de usuario del sistema del portfolio con catalog_management: el catálogo es del negocio, no de un número.
function token() {
  const t = process.env.META_SYSTEM_USER_TOKEN;
  if (!t) throw new Error('Falta META_SYSTEM_USER_TOKEN en las variables de entorno.');
  return t;
}

const AVAILABILITY = { available: 'in stock', reserved: 'available for order', sold: 'out of stock' } as const;

// Meta exige link a una página del producto: la ficha pública del CRM (o del sitio, si está configurado).
export function vehicleUrl(v: Pick<Vehicle, 'id'>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://crm-whatsapp-onlymotors.vercel.app';
  return `${base.replace(/\/$/, '')}/autos/${v.id}`;
}

function toProductItem(v: Vehicle) {
  const title = vehicleTitle(v).slice(0, 100);
  const details = [v.km != null && `${v.km.toLocaleString('es-AR')} km`, v.condition === 'new' ? '0 km' : 'Usado'].filter(Boolean);
  return {
    id: v.retailer_id,
    title,
    description: (v.description?.trim() || `${title}. ${details.join(' · ')}.`).slice(0, 5000),
    availability: AVAILABILITY[v.status],
    condition: v.condition,
    // Formato de Meta: monto, espacio y código ISO de moneda. Sin precio no se puede publicar.
    price: `${Number(v.price).toFixed(2)} ${v.currency}`,
    link: vehicleUrl(v),
    image_link: v.images[0],
    image: v.images.map((url) => ({ url })),
    brand: v.brand,
  };
}

export function publishProblem(v: Vehicle) {
  if (v.price == null) return 'Falta el precio';
  if (!v.images.length) return 'Falta al menos una foto';
  return null;
}

type BatchResult = { handles?: string[]; validation_status?: { retailer_id: string; errors?: { message: string }[] }[] };

export async function upsertProducts(catalogId: string, vehicles: Vehicle[]) {
  const data = await graph<BatchResult>(`/${catalogId}/items_batch`, {
    method: 'POST',
    token: token(),
    body: JSON.stringify({
      item_type: 'PRODUCT_ITEM',
      allow_upsert: true,
      requests: vehicles.map((v) => ({ method: 'UPDATE', data: toProductItem(v) })),
    }),
  });
  // Errores por producto: Meta acepta el lote igual y rechaza solo los inválidos.
  const errors = new Map<string, string>();
  for (const s of data.validation_status ?? []) {
    if (s.errors?.length) errors.set(s.retailer_id, s.errors.map((e) => e.message).join('; '));
  }
  return errors;
}

export async function deleteProduct(catalogId: string, retailerId: string) {
  await graph(`/${catalogId}/items_batch`, {
    method: 'POST',
    token: token(),
    body: JSON.stringify({ item_type: 'PRODUCT_ITEM', requests: [{ method: 'DELETE', data: { id: retailerId } }] }),
  });
}

export type CatalogProduct = {
  retailer_id: string;
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  image_url?: string;
  availability?: string;
  condition?: string;
  brand?: string;
};

export async function listProducts(catalogId: string) {
  const products: CatalogProduct[] = [];
  let path: string | null =
    `/${catalogId}/products?fields=retailer_id,name,description,price,currency,image_url,availability,condition,brand&limit=100`;
  while (path) {
    const page: { data: CatalogProduct[]; paging?: { next?: string } } = await graph(path, { token: token() });
    products.push(...page.data);
    path = page.paging?.next ? page.paging.next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+/, '') : null;
  }
  return products;
}

export async function getCatalog(catalogId: string) {
  return graph<{ id: string; name: string; product_count?: number }>(`/${catalogId}?fields=id,name,product_count`, {
    token: token(),
  });
}
