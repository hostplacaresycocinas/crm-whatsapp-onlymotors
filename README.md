# CRM WhatsApp

CRM de seguimiento sobre WhatsApp Cloud API con **coexistencia**: el número sigue funcionando en la app del celular y todo lo que entra o sale queda registrado acá.

Stack: Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres + Auth + Realtime) · Vercel.

## Qué hace el MVP

- Bandeja de conversaciones en tiempo real (mensajes del cliente + los que mandás desde el celular)
- Etapas del lead: nuevo → contactado → interesado → negociando → ganado / perdido
- Seguimientos con fecha y filtro "Seguimientos pendientes"
- Notas por contacto
- Responder desde el CRM **solo dentro de las 24 h** (gratis). Pasado ese plazo se escribe desde el celular.
- Multi-tenant desde el inicio: cada usuario ve solo los datos de su tenant (RLS)

No usa plantillas → no genera costos de WhatsApp.

## Estructura

```
supabase/migrations/0001_init.sql   Tablas, RLS, función ingest_message, realtime
supabase/migrations/0002_*.sql      Coexistencia: historial, estado de conexión del número
src/proxy.ts                        Sesión de Supabase + redirect a /login
src/app/api/whatsapp/webhook/       Webhook de Meta (verificación + firma + ingesta)
src/lib/whatsapp/webhook.ts         Parseo de messages / smb_message_echoes / statuses / history / smb_app_state_sync / account_update
src/lib/whatsapp/send.ts            Envío de texto por Cloud API
src/app/inbox/                      UI: lista, conversación, panel del contacto
```

## Puesta en marcha

### 1. Supabase
1. Crear proyecto en supabase.com (plan gratis).
2. Ejecutar las migraciones de `supabase/migrations/` en orden (SQL Editor, o por el MCP de Supabase).
3. Authentication → Users → **Add user** con tu email y contraseña. Desactivar "Allow new users to sign up" en Authentication → Sign In / Providers.
4. Crear tu tenant y vincular el número (reemplazar valores):

```sql
with t as (insert into tenants (name) values ('Agencia Grvity') returning id)
insert into tenant_members (tenant_id, user_id)
select t.id, (select id from auth.users where email = 'TU_EMAIL') from t;

insert into whatsapp_accounts (tenant_id, waba_id, phone_number_id, display_phone_number, access_token)
values ((select id from tenants where name = 'Agencia Grvity'), 'WABA_ID', 'PHONE_NUMBER_ID', '+54...', 'TOKEN');
```

### 2. Variables de entorno
Copiar `.env.example` a `.env.local` y completar. Las mismas van en Vercel.

### 3. Meta (WhatsApp)
1. Crear una app de tipo Business con el caso de uso **Conectarte con los clientes a través de WhatsApp**, vinculada al portfolio comercial verificado.
2. Probar primero con el **número de prueba** que crea Meta (hasta 5 destinatarios).
3. Webhook: URL pública `https://<tu-dominio>/api/whatsapp/webhook` (Vercel o túnel), verify token = `WHATSAPP_VERIFY_TOKEN`.
4. Suscribir los campos **messages**, **smb_message_echoes**, **history**, **smb_app_state_sync** y **account_update**.

#### Coexistencia (número real que se sigue usando en la app WhatsApp Business)
- **No** agregar el número desde el panel de la app ("Agregar número de teléfono" / "Configuración de producción") ni con herramientas que lo registren (`register_phone_number`, etc.): eso lo pasa a solo-API y se pierde el historial de la app.
- En el CRM: **/connect** → "Conectar mi WhatsApp Business". Usa la configuración de Inicio de sesión con Facebook para empresas creada desde la plantilla "registro insertado de WhatsApp con token de 60 días" (`NEXT_PUBLIC_META_ES_CONFIG_ID`). El dominio tiene que estar en *Allowed domains* y *Valid OAuth redirect URIs* de esa configuración, con HTTPS (no anda en localhost).
- La coexistencia se hace **solo por Embedded Signup** (v4+, `featureType: "whatsapp_business_app_onboarding"`; en v5 viene activo). La v2 y v3 quedaron deprecadas el 15/10/2026.
- Requiere ser **Tech Provider**, también para tu propio número: verificación del negocio + **App Review** (`whatsapp_business_messaging`, `whatsapp_business_management`) + verificación de acceso.
- Celular con WhatsApp Business ≥ 2.24.17. Después del onboarding hay **24 h** para pedir una sola vez la sincronización de contactos e historial (`POST /<PHONE_NUMBER_ID>/smb_app_data` con `sync_type` = `smb_app_state_sync` y `history`). Trae 180 días, sin grupos. Dejar la app abierta mientras sincroniza.
- En la app se desactivan mensajes temporales, ver una vez, ubicación en tiempo real y listas de difusión nuevas; se desvinculan los dispositivos (WhatsApp para Windows no se puede volver a vincular).
- Para desconectar: en la app, Configuración → Cuenta → Plataforma comercial → Desconectar. Llega un `account_update` y el número queda `disconnected` en `whatsapp_accounts`.

### 4. Correr
```bash
npm run dev
```

## Pendiente / próximos pasos
- Renovar el token del Embedded Signup antes de que venza (hoy solo se avisa en `/connect`)
- Reintentar `smb_app_data` desde la UI si falló al conectar
- Avisar en la bandeja cuando un número queda `disconnected`
- Multimedia: hoy solo se guarda el `media_id`, no el archivo
- Sugerencias de mensajes con IA
- Más de un número por tenant
