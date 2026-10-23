-- Stock de autos: el CRM es la fuente; se publica al catálogo de Meta (WhatsApp) y lo lee el sitio web.

alter table public.tenants add column meta_catalog_id text;

create table public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants on delete cascade,
  -- Identificador del producto en el catálogo de Meta ("id" del items_batch).
  retailer_id     text not null,
  brand           text not null,
  model           text not null,
  version         text,
  year            int,
  km              int,
  price           numeric(14, 2),
  currency        text not null default 'ARS',
  condition       text not null default 'used' check (condition in ('new', 'used')),
  status          text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  description     text,
  images          text[] not null default '{}',
  meta_synced_at  timestamptz,
  meta_sync_error text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, retailer_id)
);
create index vehicles_tenant_status_idx on public.vehicles (tenant_id, status, updated_at desc);

alter table public.vehicles enable row level security;

create policy "members read vehicles"   on public.vehicles for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "members insert vehicles" on public.vehicles for insert to authenticated with check (public.is_tenant_member(tenant_id));
create policy "members update vehicles" on public.vehicles for update to authenticated
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));
create policy "members delete vehicles" on public.vehicles for delete to authenticated using (public.is_tenant_member(tenant_id));
