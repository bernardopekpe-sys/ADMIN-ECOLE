-- ============================================================================
-- ADDENDUM 8 — STOCKAGE DES DOCUMENTS (Supabase Storage)
-- ============================================================================
-- Referme le dernier manque listé dans le README : la table `documents`
-- existait déjà (LIVRABLE 7, §13) mais rien ne branchait Supabase Storage.
-- Organisation des chemins : <school_id>/<owner_type>/<owner_id>/<fichier>
-- (reprend l'arborescence "school/students/... school/personnel/..." du
-- cahier des charges, §46), avec school_id en tête de chemin pour que les
-- policies ci-dessous appliquent l'isolation multi-tenant directement sur
-- storage.objects — pas seulement sur la table documents.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_tenant_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = current_school_id()::text
  );

create policy "documents_tenant_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = current_school_id()::text
  );

create policy "documents_tenant_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = current_school_id()::text
  );

comment on policy "documents_tenant_select" on storage.objects is
  'Isolation multi-tenant appliquée directement sur storage.objects, pas seulement sur la table documents — un school_id en tête de chemin est donc obligatoire pour tout fichier uploadé.';
