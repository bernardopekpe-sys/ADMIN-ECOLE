-- ============================================================================
-- ADDENDUM 2 — GÉNÉRATION AUTOMATIQUE DES FRAIS À L'INSCRIPTION
-- ============================================================================
-- Complète le workflow n°6 (06-workflows.md) : quand une inscription passe
-- au statut 'inscrit', les fee_assignments applicables (correspondant à
-- l'année scolaire et à la classe/niveau/cycle de l'élève, ou génériques)
-- doivent générer automatiquement les student_fees correspondants — qui
-- déclenchent eux-mêmes generate_student_fee_installments (déjà posé dans
-- 0003_periodes_tranches.sql). Une seule saisie (l'inscription) propage
-- tout le reste, conformément à la règle métier §4.7 du document d'architecture.
-- ============================================================================

create or replace function generate_fees_for_enrollment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_enrollment enrollments%rowtype;
  v_class classes%rowtype;
  v_fa record;
begin
  select * into v_enrollment from enrollments where id = p_enrollment_id;
  select * into v_class from classes where id = v_enrollment.class_id;

  -- Un frais s'applique s'il correspond exactement à la classe, ou au niveau,
  -- ou au cycle, ou s'il est générique (aucun des trois renseigné) pour cette année.
  for v_fa in
    select * from fee_assignments
    where school_id = v_enrollment.school_id
      and academic_year_id = v_enrollment.academic_year_id
      and is_active = true
      and (
        class_id = v_class.id
        or (class_id is null and level_id = v_class.level_id)
        or (class_id is null and level_id is null and cycle_id = v_class.cycle_id)
        or (class_id is null and level_id is null and cycle_id is null)
      )
  loop
    -- Évite les doublons si l'inscription est retraitée (ex. correction de classe).
    insert into student_fees (school_id, student_id, academic_year_id, fee_assignment_id, amount_due)
    values (v_enrollment.school_id, v_enrollment.student_id, v_enrollment.academic_year_id, v_fa.id, v_fa.amount)
    on conflict (student_id, fee_assignment_id) do nothing;
  end loop;
end;
$$;
comment on function generate_fees_for_enrollment is
  'Sélectionne le fee_assignment le plus spécifique disponible (classe > niveau > cycle > générique) — appelée automatiquement quand une inscription passe au statut inscrit.';

create or replace function trg_enrollment_status_change()
returns trigger
language plpgsql
as $$
declare
  v_should_fire boolean;
begin
  -- OLD n'est pas assigné sur un INSERT : on distingue explicitement les cas
  -- plutôt que de compter sur le court-circuit d'un OR (non garanti en SQL).
  if tg_op = 'INSERT' then
    v_should_fire := (new.status = 'inscrit');
  else
    v_should_fire := (new.status = 'inscrit' and old.status is distinct from 'inscrit');
  end if;

  if v_should_fire then
    perform generate_fees_for_enrollment(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enrollments_generate_fees on enrollments;
create trigger trg_enrollments_generate_fees
  after insert or update of status on enrollments
  for each row execute function trg_enrollment_status_change();
