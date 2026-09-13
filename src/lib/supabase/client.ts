import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur — utilisé dans les Client Components.
 * S'appuie sur la clé publique (anon) : toute la sécurité réelle est
 * appliquée par les policies RLS définies dans supabase/migrations/0002_rls_et_fonctions.sql,
 * jamais par ce fichier.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
