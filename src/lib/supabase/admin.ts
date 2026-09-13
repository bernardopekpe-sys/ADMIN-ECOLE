import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Client Supabase avec la clé service_role — à utiliser UNIQUEMENT dans des
 * Server Actions/Route Handlers de confiance (jamais côté navigateur, jamais
 * exposé au client). Sert notamment à créer des comptes Supabase Auth pour
 * le personnel (workflow n°17), une opération que la clé anon ne permet pas.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
