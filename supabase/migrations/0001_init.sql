-- CRM WhatsApp — esquema inicial (multi-tenant)

create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  role      text not null default 'owner',
  primary key (tenant_id, user_id)
);

-- Un número de WhatsApp conectado. El token nunca se expone al cliente (sin policies).
create table public.whatsapp_accounts (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants on delete cascade,
  waba_id              text,
  phone_number_id      text not null unique,
  display_phone_number text,
  access_token         text,
  created_at           timestamptz not null default now()
);

create type public.lead_stage as enum
  ('nuevo', 'contactado', 'interesado', 'negociando', 'ganado', 'perdido');

create table public.contacts (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants on delete cascade,
  wa_id                text not null,
  name                 text,
  stage                public.lead_stage not null default 'nuevo',
  follow_up_at         timestamptz,
  last_message_at      timestamptz,
  last_inbound_at      timestamptz,
  last_message_preview text,
  unread_count         int not null default 0,
  created_at           timestamptz not null default now(),
  unique (tenant_id, wa_id)
);
create index contacts_tenant_last_message_idx on public.contacts (tenant_id, last_message_at desc);

-- direction: in = del cliente, out = nuestro
-- source:    customer | app (enviado desde el celular, vía echo) | api (enviado desde el CRM)
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants on delete cascade,
  contact_id    uuid not null references public.contacts on delete cascade,
  wa_message_id text not null unique,
  direction     text not null check (direction in ('in', 'out')),
  source        text not null check (source in ('customer', 'app', 'api')),
  type          text not null,
  body          text,
  media_id      text,
  status        text,
  sent_at       timestamptz not null,
  raw           jsonb,
  created_at    timestamptz not null default now()
);
create index messages_contact_sent_idx on public.messages (contact_id, sent_at);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants on delete cascade,
  contact_id uuid not null references public.contacts on delete cascade,
  author_id  uuid references auth.users on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index notes_contact_idx on public.notes (contact_id, created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────

create function public.is_tenant_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from tenant_members where tenant_id = t and user_id = auth.uid());
$$;

alter table public.tenants           enable row level security;
alter table public.tenant_members    enable row level security;
alter table public.whatsapp_accounts enable row level security;
alter table public.contacts          enable row level security;
alter table public.messages          enable row level security;
alter table public.notes             enable row level security;

create policy "members read tenant"      on public.tenants        for select to authenticated using (public.is_tenant_member(id));
create policy "members read memberships" on public.tenant_members for select to authenticated using (user_id = auth.uid());

create policy "members read contacts"   on public.contacts for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "members update contacts" on public.contacts for update to authenticated
  using (public.is_tenant_member(tenant_id)) with check (public.is_tenant_member(tenant_id));

create policy "members read messages" on public.messages for select to authenticated using (public.is_tenant_member(tenant_id));

create policy "members read notes"   on public.notes for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "members insert notes" on public.notes for insert to authenticated
  with check (public.is_tenant_member(tenant_id) and author_id = auth.uid());

-- ── Ingesta desde el webhook ───────────────────────────────────────────
-- Atómica e idempotente: Meta reintenta webhooks, el wa_message_id unique evita duplicados.

create function public.ingest_message(
  p_phone_number_id text,
  p_wa_id           text,
  p_name            text,
  p_wa_message_id   text,
  p_direction       text,
  p_source          text,
  p_type            text,
  p_body            text,
  p_media_id        text,
  p_sent_at         timestamptz,
  p_raw             jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tenant   uuid;
  v_contact  uuid;
  v_inserted int;
begin
  select tenant_id into v_tenant from whatsapp_accounts where phone_number_id = p_phone_number_id;
  if v_tenant is null then return; end if;

  insert into contacts (tenant_id, wa_id, name)
  values (v_tenant, p_wa_id, p_name)
  on conflict (tenant_id, wa_id) do update set name = coalesce(excluded.name, contacts.name)
  returning id into v_contact;

  insert into messages (tenant_id, contact_id, wa_message_id, direction, source, type, body, media_id, sent_at, raw)
  values (v_tenant, v_contact, p_wa_message_id, p_direction, p_source, p_type, p_body, p_media_id, p_sent_at, p_raw)
  on conflict (wa_message_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return; end if;

  -- En SET, las columnas referencian los valores previos de la fila.
  update contacts set
    last_message_preview = case
      when last_message_at is null or p_sent_at >= last_message_at
      then left(coalesce(p_body, '[' || p_type || ']'), 120)
      else last_message_preview end,
    last_message_at = greatest(coalesce(last_message_at, p_sent_at), p_sent_at),
    last_inbound_at = case
      when p_direction = 'in' then greatest(coalesce(last_inbound_at, p_sent_at), p_sent_at)
      else last_inbound_at end,
    unread_count = case when p_direction = 'in' then unread_count + 1 else 0 end
  where id = v_contact;
end;
$$;

revoke execute on function public.ingest_message from public, anon, authenticated;

-- Realtime (respeta RLS)
alter publication supabase_realtime add table public.contacts, public.messages, public.notes;
