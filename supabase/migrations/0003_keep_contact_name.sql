-- El nombre del perfil de WhatsApp solo completa contactos sin nombre:
-- no pisa el que viene de la agenda del celular (smb_app_state_sync) ni uno ya guardado.
create or replace function public.ingest_message(
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
  p_raw             jsonb,
  p_is_history      boolean default false
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
  on conflict (tenant_id, wa_id) do update set name = coalesce(contacts.name, excluded.name)
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
      when p_direction = 'in' and not p_is_history then greatest(coalesce(last_inbound_at, p_sent_at), p_sent_at)
      else last_inbound_at end,
    unread_count = case
      when p_is_history then unread_count
      when p_direction = 'in' then unread_count + 1
      else 0 end
  where id = v_contact;
end;
$$;

revoke execute on function public.ingest_message from public, anon, authenticated;
