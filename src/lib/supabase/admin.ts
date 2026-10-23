import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Saltea RLS. Usar solo en el webhook y en acciones que necesitan el token de WhatsApp.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
