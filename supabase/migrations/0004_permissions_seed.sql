-- ============================================================================
-- SEED — CATALOGUE DE PERMISSIONS & INITIALISATION DES RÔLES PAR ÉTABLISSEMENT
-- ============================================================================
-- Complète le LIVRABLE 7/8. Deux parties :
--   A. Catalogue global permissions (module, action) — table de référence,
--      partagée par tous les établissements (non tenant).
--   B. Fonction initialize_default_roles(school_id) — crée les 8 rôles
--      standards et leur attribue les permissions par défaut décrites dans
--      05-matrice-permissions.md. Appelée une seule fois, à la création
--      d'un établissement (depuis l'onboarding Super Admin).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. CATALOGUE DE PERMISSIONS
-- ----------------------------------------------------------------------------
insert into permissions (module, action) values
  ('etablissement','consulter'), ('etablissement','modifier'),
  ('annees_scolaires','consulter'), ('annees_scolaires','creer'), ('annees_scolaires','modifier'), ('annees_scolaires','valider'),
  ('classes','consulter'), ('classes','creer'), ('classes','modifier'), ('classes','supprimer'),
  ('eleves','consulter'), ('eleves','creer'), ('eleves','modifier'), ('eleves','supprimer'),
  ('parents','consulter'), ('parents','creer'), ('parents','modifier'),
  ('inscriptions','consulter'), ('inscriptions','creer'), ('inscriptions','modifier'), ('inscriptions','valider'),
  ('documents','consulter'), ('documents','creer'), ('documents','imprimer'),
  ('frais','consulter'), ('frais','creer'), ('frais','modifier'),
  ('remises','consulter'), ('remises','creer'), ('remises','valider'),
  ('paiements','consulter'), ('paiements','creer'), ('paiements','annuler'), ('paiements','exporter'), ('paiements','imprimer'),
  ('recus','consulter'), ('recus','exporter'), ('recus','imprimer'),
  ('impayes','consulter'), ('impayes','exporter'),
  ('caisse','consulter'), ('caisse','creer'), ('caisse','valider'),
  ('banques','consulter'), ('banques','creer'), ('banques','modifier'),
  ('depenses','consulter'), ('depenses','creer'), ('depenses','modifier'), ('depenses','valider'),
  ('fournisseurs','consulter'), ('fournisseurs','creer'), ('fournisseurs','modifier'),
  ('budget','consulter'), ('budget','creer'), ('budget','modifier'), ('budget','valider'),
  ('plan_comptable','consulter'), ('plan_comptable','creer'), ('plan_comptable','modifier'),
  ('journaux','consulter'), ('journaux','creer'), ('journaux','modifier'),
  ('ecritures','consulter'), ('ecritures','creer'), ('ecritures','valider'),
  ('grand_livre','consulter'), ('grand_livre','exporter'),
  ('etats_financiers','consulter'), ('etats_financiers','creer'), ('etats_financiers','exporter'),
  ('personnel','consulter'), ('personnel','consulter_salaire'), ('personnel','creer'), ('personnel','modifier'),
  ('comptes_utilisateurs','creer'), ('comptes_utilisateurs','modifier'),
  ('primes','consulter'), ('primes','creer'), ('primes','valider'),
  ('avances','consulter'), ('avances','creer'), ('avances','valider'),
  ('prets','consulter'), ('prets','creer'), ('prets','valider'),
  ('retenues','consulter'), ('retenues','creer'), ('retenues','valider'),
  ('paie','consulter'), ('paie','creer'), ('paie','modifier'), ('paie','valider'), ('paie','imprimer'),
  ('absences_personnel','consulter'), ('absences_personnel','creer'), ('absences_personnel','modifier'),
  ('absences_eleves','consulter'), ('absences_eleves','creer'), ('absences_eleves','modifier'), ('absences_eleves','valider'),
  ('retards_eleves','consulter'), ('retards_eleves','creer'), ('retards_eleves','modifier'),
  ('discipline','consulter'), ('discipline','creer'), ('discipline','modifier'), ('discipline','valider'),
  ('rapports_financiers','consulter'), ('rapports_financiers','exporter'),
  ('rapports_scolaires','consulter'), ('rapports_scolaires','exporter'),
  ('rapports_paie','consulter'), ('rapports_paie','exporter'),
  ('utilisateurs','consulter'), ('utilisateurs','creer'), ('utilisateurs','modifier'),
  ('roles_permissions','consulter'), ('roles_permissions','modifier'),
  ('numerotation','consulter'), ('numerotation','modifier'),
  ('parametres_comptables','consulter'), ('parametres_comptables','modifier')
on conflict (module, action) do nothing;

-- ----------------------------------------------------------------------------
-- B. INITIALISATION DES RÔLES PAR DÉFAUT POUR UN ÉTABLISSEMENT
-- ----------------------------------------------------------------------------
create or replace function initialize_default_roles(p_school_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role_id uuid;
  v_perm_id uuid;
  -- role_name, module, action — reflète 05-matrice-permissions.md
  v_grants text[][] := array[
    -- DIRECTEUR : vision large + validations stratégiques
    array['Directeur','etablissement','consulter'], array['Directeur','annees_scolaires','consulter'],
    array['Directeur','eleves','consulter'], array['Directeur','inscriptions','consulter'], array['Directeur','inscriptions','valider'],
    array['Directeur','paiements','consulter'], array['Directeur','paiements','annuler'], array['Directeur','recus','consulter'], array['Directeur','recus','imprimer'],
    array['Directeur','impayes','consulter'], array['Directeur','impayes','exporter'],
    array['Directeur','caisse','consulter'], array['Directeur','banques','consulter'],
    array['Directeur','depenses','valider'], array['Directeur','depenses','consulter'],
    array['Directeur','budget','consulter'], array['Directeur','budget','valider'],
    array['Directeur','plan_comptable','consulter'], array['Directeur','journaux','consulter'], array['Directeur','ecritures','consulter'],
    array['Directeur','grand_livre','consulter'], array['Directeur','grand_livre','exporter'],
    array['Directeur','etats_financiers','consulter'], array['Directeur','etats_financiers','exporter'],
    array['Directeur','personnel','consulter'], array['Directeur','primes','valider'], array['Directeur','avances','valider'],
    array['Directeur','prets','valider'], array['Directeur','retenues','valider'],
    array['Directeur','paie','consulter'], array['Directeur','paie','valider'], array['Directeur','paie','imprimer'],
    array['Directeur','discipline','valider'], array['Directeur','absences_eleves','consulter'],
    array['Directeur','rapports_financiers','consulter'], array['Directeur','rapports_financiers','exporter'],
    array['Directeur','rapports_scolaires','consulter'], array['Directeur','rapports_paie','consulter'],
    array['Directeur','utilisateurs','consulter'], array['Directeur','roles_permissions','consulter'], array['Directeur','roles_permissions','modifier'],
    array['Directeur','parametres_comptables','consulter'], array['Directeur','numerotation','consulter'],
    array['Directeur','remises','valider'],

    -- ADMINISTRATEUR : administratif (élèves, inscriptions, personnel), pas de finance
    array['Administrateur','annees_scolaires','creer'], array['Administrateur','annees_scolaires','modifier'], array['Administrateur','annees_scolaires','valider'],
    array['Administrateur','classes','consulter'], array['Administrateur','classes','creer'], array['Administrateur','classes','modifier'], array['Administrateur','classes','supprimer'],
    array['Administrateur','eleves','consulter'], array['Administrateur','eleves','creer'], array['Administrateur','eleves','modifier'], array['Administrateur','eleves','supprimer'],
    array['Administrateur','parents','consulter'], array['Administrateur','parents','creer'], array['Administrateur','parents','modifier'],
    array['Administrateur','inscriptions','consulter'], array['Administrateur','inscriptions','creer'], array['Administrateur','inscriptions','modifier'], array['Administrateur','inscriptions','valider'],
    array['Administrateur','documents','consulter'], array['Administrateur','documents','creer'], array['Administrateur','documents','imprimer'],
    array['Administrateur','fournisseurs','consulter'], array['Administrateur','fournisseurs','creer'], array['Administrateur','fournisseurs','modifier'],
    array['Administrateur','personnel','consulter'], array['Administrateur','personnel','creer'], array['Administrateur','personnel','modifier'],
    array['Administrateur','comptes_utilisateurs','creer'], array['Administrateur','comptes_utilisateurs','modifier'],
    array['Administrateur','utilisateurs','consulter'], array['Administrateur','utilisateurs','creer'], array['Administrateur','utilisateurs','modifier'],
    array['Administrateur','rapports_scolaires','consulter'], array['Administrateur','rapports_scolaires','exporter'],
    array['Administrateur','depenses','creer'], array['Administrateur','etablissement','consulter'], array['Administrateur','etablissement','modifier'],

    -- COMPTABLE : finances, comptabilité, paie
    array['Comptable','frais','consulter'], array['Comptable','frais','creer'], array['Comptable','frais','modifier'],
    array['Comptable','remises','consulter'], array['Comptable','remises','creer'], array['Comptable','remises','valider'],
    array['Comptable','paiements','consulter'], array['Comptable','paiements','exporter'],
    array['Comptable','recus','consulter'], array['Comptable','recus','exporter'], array['Comptable','recus','imprimer'],
    array['Comptable','impayes','consulter'], array['Comptable','impayes','exporter'],
    array['Comptable','caisse','consulter'], array['Comptable','caisse','valider'],
    array['Comptable','banques','consulter'], array['Comptable','banques','creer'], array['Comptable','banques','modifier'],
    array['Comptable','depenses','creer'], array['Comptable','depenses','modifier'], array['Comptable','depenses','consulter'],
    array['Comptable','fournisseurs','consulter'], array['Comptable','fournisseurs','creer'], array['Comptable','fournisseurs','modifier'],
    array['Comptable','budget','consulter'], array['Comptable','budget','creer'], array['Comptable','budget','modifier'],
    array['Comptable','plan_comptable','consulter'], array['Comptable','plan_comptable','creer'], array['Comptable','plan_comptable','modifier'],
    array['Comptable','journaux','consulter'], array['Comptable','journaux','creer'], array['Comptable','journaux','modifier'],
    array['Comptable','ecritures','consulter'], array['Comptable','ecritures','creer'], array['Comptable','ecritures','valider'],
    array['Comptable','grand_livre','consulter'], array['Comptable','grand_livre','exporter'],
    array['Comptable','etats_financiers','consulter'], array['Comptable','etats_financiers','creer'], array['Comptable','etats_financiers','exporter'],
    array['Comptable','personnel','consulter'], array['Comptable','primes','consulter'], array['Comptable','primes','creer'], array['Comptable','primes','valider'],
    array['Comptable','avances','consulter'], array['Comptable','avances','creer'], array['Comptable','avances','valider'],
    array['Comptable','prets','consulter'], array['Comptable','prets','creer'], array['Comptable','prets','valider'],
    array['Comptable','retenues','consulter'], array['Comptable','retenues','creer'], array['Comptable','retenues','valider'],
    array['Comptable','paie','consulter'], array['Comptable','paie','creer'], array['Comptable','paie','modifier'], array['Comptable','paie','imprimer'],
    array['Comptable','rapports_financiers','consulter'], array['Comptable','rapports_financiers','exporter'],
    array['Comptable','rapports_paie','consulter'], array['Comptable','rapports_paie','exporter'],
    array['Comptable','numerotation','consulter'], array['Comptable','numerotation','modifier'],
    array['Comptable','parametres_comptables','consulter'], array['Comptable','parametres_comptables','modifier'],
    array['Comptable','eleves','consulter'], array['Comptable','annees_scolaires','consulter'],

    -- CAISSIER : encaissements uniquement
    array['Caissier','eleves','consulter'], array['Caissier','parents','consulter'],
    array['Caissier','paiements','creer'], array['Caissier','paiements','imprimer'],
    array['Caissier','recus','creer'], array['Caissier','recus','imprimer'],
    array['Caissier','impayes','consulter'], array['Caissier','caisse','creer'], array['Caissier','caisse','valider'],

    -- VIE SCOLAIRE : absences, retards, discipline élèves
    array['Vie scolaire','eleves','consulter'], array['Vie scolaire','absences_eleves','consulter'],
    array['Vie scolaire','absences_eleves','creer'], array['Vie scolaire','absences_eleves','modifier'], array['Vie scolaire','absences_eleves','valider'],
    array['Vie scolaire','retards_eleves','consulter'], array['Vie scolaire','retards_eleves','creer'], array['Vie scolaire','retards_eleves','modifier'],
    array['Vie scolaire','discipline','consulter'], array['Vie scolaire','discipline','creer'], array['Vie scolaire','discipline','modifier'], array['Vie scolaire','discipline','valider'],

    -- ENSEIGNANT : ses classes + ses propres infos
    array['Enseignant','eleves','consulter'], array['Enseignant','classes','consulter'],
    array['Enseignant','personnel','consulter'], array['Enseignant','paie','consulter'], array['Enseignant','paie','imprimer'],
    array['Enseignant','avances','consulter'], array['Enseignant','prets','consulter'], array['Enseignant','retenues','consulter'],
    array['Enseignant','absences_eleves','creer'],

    -- SECRÉTAIRE : élèves, inscriptions, documents
    array['Secrétaire','eleves','consulter'], array['Secrétaire','eleves','creer'], array['Secrétaire','eleves','modifier'],
    array['Secrétaire','parents','consulter'], array['Secrétaire','parents','creer'], array['Secrétaire','parents','modifier'],
    array['Secrétaire','inscriptions','consulter'], array['Secrétaire','inscriptions','creer'], array['Secrétaire','inscriptions','modifier'],
    array['Secrétaire','documents','consulter'], array['Secrétaire','documents','creer'], array['Secrétaire','documents','imprimer'],
    array['Secrétaire','classes','consulter'], array['Secrétaire','classes','creer'], array['Secrétaire','classes','modifier'],
    array['Secrétaire','frais','consulter'], array['Secrétaire','paiements','consulter'], array['Secrétaire','recus','consulter'],
    array['Secrétaire','annees_scolaires','consulter'], array['Secrétaire','rapports_scolaires','consulter'], array['Secrétaire','rapports_scolaires','exporter'],

    -- CONSULTATION : lecture seule sur le périmètre non-nominatif financier
    array['Consultation','etablissement','consulter'], array['Consultation','annees_scolaires','consulter'],
    array['Consultation','classes','consulter'], array['Consultation','eleves','consulter'], array['Consultation','parents','consulter'],
    array['Consultation','inscriptions','consulter'], array['Consultation','documents','consulter'],
    array['Consultation','frais','consulter'], array['Consultation','paiements','consulter'], array['Consultation','recus','consulter'],
    array['Consultation','impayes','consulter'], array['Consultation','caisse','consulter'], array['Consultation','banques','consulter'],
    array['Consultation','fournisseurs','consulter'], array['Consultation','budget','consulter'],
    array['Consultation','plan_comptable','consulter'], array['Consultation','journaux','consulter'], array['Consultation','ecritures','consulter'],
    array['Consultation','grand_livre','consulter'], array['Consultation','etats_financiers','consulter'],
    array['Consultation','personnel','consulter'], array['Consultation','absences_eleves','consulter'], array['Consultation','retards_eleves','consulter'],
    array['Consultation','discipline','consulter'], array['Consultation','rapports_financiers','consulter'],
    array['Consultation','rapports_scolaires','consulter']
  ];
  v_grant text[];
  v_role_name text;
begin
  -- 1. Créer les 8 rôles standards (idempotent)
  foreach v_role_name in array array['Directeur','Administrateur','Comptable','Caissier','Vie scolaire','Enseignant','Secrétaire','Consultation']
  loop
    insert into roles (school_id, name, is_system_role)
    values (p_school_id, v_role_name, true)
    on conflict (school_id, name) do nothing;
  end loop;

  -- 2. Attribuer les permissions de la matrice par défaut
  foreach v_grant slice 1 in array v_grants
  loop
    select id into v_role_id from roles where school_id = p_school_id and name = v_grant[1];
    select id into v_perm_id from permissions where module = v_grant[2] and action = v_grant[3];

    if v_role_id is null then
      raise exception 'Rôle % introuvable pour l''établissement %.', v_grant[1], p_school_id;
    end if;
    if v_perm_id is null then
      raise exception 'Permission %/% introuvable au catalogue.', v_grant[2], v_grant[3];
    end if;

    insert into role_permissions (role_id, permission_id)
    values (v_role_id, v_perm_id)
    on conflict (role_id, permission_id) do nothing;
  end loop;
end;
$$;
comment on function initialize_default_roles is
  'Appelée une seule fois à la création d''un établissement (onboarding). Reflète 05-matrice-permissions.md — modifiable ensuite librement depuis Paramètres > Rôles & permissions, sans toucher au code.';

-- Exemple d'utilisation, à appeler juste après l'insertion d'une nouvelle ligne dans schools :
-- select initialize_default_roles('<uuid-du-nouvel-etablissement>');
