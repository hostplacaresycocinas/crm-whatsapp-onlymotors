-- El token del Embedded Signup vence (configuración de 60 días): guardar cuándo, para avisar antes.
alter table public.whatsapp_accounts
  add column access_token_expires_at timestamptz,
  add column connected_at            timestamptz;
