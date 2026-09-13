-- ============================================================================
-- ADDENDUM AU LIVRABLE 7 — PÉRIODES D'ÉTUDE & PÉRIODICITÉ DES TRANCHES
-- ============================================================================
-- Prend en compte deux précisions apportées après coup :
--   1. Les tranches de paiement peuvent être mensuelles, trimestrielles ou
--      "autre" (personnalisée) — pas seulement mensuelles comme esquissé
--      initialement dans student_fee_installments.
--   2. Les périodes d'étude d'un établissement peuvent être organisées soit
--      en trimestres (1 à 3), soit en paliers (1 à 6) — c'est un choix propre
--      à chaque établissement, potentiellement même à chaque année scolaire.
--
-- Ce fichier s'applique après 01-schema-sql.sql. Il ajoute des tables et
-- des colonnes ; il ne modifie aucune donnée existante.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Système de périodes pédagogiques (trimestre ou palier), par année scolaire
-- ----------------------------------------------------------------------------
-- Le choix se fait par année scolaire (et non figé au niveau de l'établissement)
-- pour permettre une transition d'un système à l'autre sans casser l'historique.

alter table academic_years
  add column period_system text not null default 'trimestre'
  check (period_system in ('trimestre', 'palier'));
comment on column academic_years.period_system is
  'trimestre = 3 périodes, palier = 6 périodes. Choisi à la création de l''année scolaire.';

create table study_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  period_number int not null,                       -- 1..3 si trimestre, 1..6 si palier
  label text not null,                               -- 'Trimestre 1', 'Palier 3'...
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint chk_period_dates check (end_date > start_date),
  unique (academic_year_id, period_number)
);
comment on table study_periods is
  'Découpage réel de l''année en trimestres ou paliers, avec dates. Sert à la fois à la pédagogie (bulletins, notes — V5) et, en option, au calendrier des tranches de frais (voir §2).';

create index idx_study_periods_year on study_periods(academic_year_id);

-- Contrainte applicative (à vérifier côté fonction/trigger, pas exprimable
-- proprement en check constraint simple) : period_number doit rester cohérent
-- avec academic_years.period_system (1-3 pour trimestre, 1-6 pour palier).
create or replace function check_period_number()
returns trigger
language plpgsql
as $$
declare
  v_system text;
  v_max int;
begin
  select period_system into v_system from academic_years where id = new.academic_year_id;
  v_max := case v_system when 'trimestre' then 3 when 'palier' then 6 end;

  if new.period_number < 1 or new.period_number > v_max then
    raise exception 'period_number % invalide pour le système % (attendu entre 1 et %).',
      new.period_number, v_system, v_max;
  end if;

  return new;
end;
$$;

create trigger trg_check_period_number
  before insert or update on study_periods
  for each row execute function check_period_number();

-- ----------------------------------------------------------------------------
-- 2. Périodicité flexible des tranches de frais
-- ----------------------------------------------------------------------------
-- fee_assignments porte désormais la périodicité choisie pour CE frais précis
-- (ex : "Scolarité" peut être mensuelle, "Cantine" peut être trimestrielle).

alter table fee_assignments
  add column installment_periodicity text not null default 'monthly'
  check (installment_periodicity in ('monthly', 'termly', 'custom', 'single'));
comment on column fee_assignments.installment_periodicity is
  'monthly = 1 tranche/mois, termly = 1 tranche par study_period (trimestre ou palier), custom = échéancier défini manuellement (fee_installment_templates), single = paiement en une fois, pas de tranches.';

-- student_fee_installments peut désormais être rattachée soit à un mois
-- calendaire (déjà couvert par label + due_date), soit explicitement à une
-- study_period lorsque la périodicité est 'termly'.
alter table student_fee_installments
  add column study_period_id uuid references study_periods(id);
comment on column student_fee_installments.study_period_id is
  'Renseigné uniquement quand fee_assignments.installment_periodicity = termly ; NULL pour monthly/custom.';

-- Modèle de tranches personnalisées, utilisé quand installment_periodicity = 'custom'
-- (ex : 40% à l'inscription, 30% en janvier, 30% en avril — répartition libre).
create table fee_installment_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  fee_assignment_id uuid not null references fee_assignments(id) on delete cascade,
  label text not null,                               -- 'Acompte à l'inscription', 'Solde avril'...
  sequence_order int not null,
  split_type text not null check (split_type in ('amount', 'percentage')),
  split_value numeric(14,2) not null check (split_value > 0),
  study_period_id uuid references study_periods(id),  -- optionnel : ancrer une tranche custom à une période
  due_offset_days int,                                 -- optionnel : échéance = date début année + N jours
  created_at timestamptz not null default now(),
  unique (fee_assignment_id, sequence_order)
);
comment on table fee_installment_templates is
  'Ne s''applique que si fee_assignments.installment_periodicity = custom. La somme des tranches en % doit faire 100, vérifiée en fonction (voir §3).';

-- ----------------------------------------------------------------------------
-- 3. Génération des tranches pour un élève, selon la périodicité du frais
-- ----------------------------------------------------------------------------
create or replace function generate_student_fee_installments(p_student_fee_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_sf student_fees%rowtype;
  v_fa fee_assignments%rowtype;
  v_period study_periods%rowtype;
  v_template fee_installment_templates%rowtype;
  v_month date;
  v_year_start date;
  v_year_end date;
  v_pct_sum numeric;
begin
  select * into v_sf from student_fees where id = p_student_fee_id;
  select * into v_fa from fee_assignments where id = v_sf.fee_assignment_id;
  select start_date, end_date into v_year_start, v_year_end
    from academic_years where id = v_sf.academic_year_id;

  if v_fa.installment_periodicity = 'single' then
    insert into student_fee_installments (school_id, student_fee_id, label, due_date, amount_due)
    values (v_sf.school_id, p_student_fee_id, v_fa.label, coalesce(v_fa.due_date, v_year_start), v_sf.amount_due);

  elsif v_fa.installment_periodicity = 'monthly' then
    v_month := date_trunc('month', v_year_start);
    while v_month <= v_year_end loop
      insert into student_fee_installments (school_id, student_fee_id, label, due_date, amount_due)
      values (
        v_sf.school_id, p_student_fee_id,
        to_char(v_month, 'TMMonth YYYY'),
        v_month,
        round(v_sf.amount_due / greatest(1, (extract(year from age(v_year_end, v_year_start)) * 12
                + extract(month from age(v_year_end, v_year_start)) + 1)), 2)
      );
      v_month := v_month + interval '1 month';
    end loop;

  elsif v_fa.installment_periodicity = 'termly' then
    for v_period in
      select * from study_periods where academic_year_id = v_sf.academic_year_id order by period_number
    loop
      insert into student_fee_installments (school_id, student_fee_id, label, due_date, amount_due, study_period_id)
      values (
        v_sf.school_id, p_student_fee_id, v_period.label, v_period.start_date,
        round(v_sf.amount_due / (select count(*) from study_periods where academic_year_id = v_sf.academic_year_id), 2),
        v_period.id
      );
    end loop;

  elsif v_fa.installment_periodicity = 'custom' then
    select coalesce(sum(split_value) filter (where split_type = 'percentage'), 0)
    into v_pct_sum
    from fee_installment_templates where fee_assignment_id = v_fa.id;

    if v_pct_sum != 0 and v_pct_sum != 100 then
      raise exception 'Le total des tranches en pourcentage pour ce frais doit faire 100 (actuellement %).', v_pct_sum;
    end if;

    for v_template in
      select * from fee_installment_templates where fee_assignment_id = v_fa.id order by sequence_order
    loop
      insert into student_fee_installments (school_id, student_fee_id, label, due_date, amount_due, study_period_id)
      values (
        v_sf.school_id, p_student_fee_id, v_template.label,
        coalesce(
          (select start_date from study_periods where id = v_template.study_period_id),
          v_year_start + coalesce(v_template.due_offset_days, 0)
        ),
        case v_template.split_type
          when 'amount' then v_template.split_value
          when 'percentage' then round(v_sf.amount_due * v_template.split_value / 100, 2)
        end,
        v_template.study_period_id
      );
    end loop;
  end if;
end;
$$;
comment on function generate_student_fee_installments is
  'Point d''entrée unique pour générer l''échéancier d''un élève, quelle que soit la périodicité choisie pour le frais. Appelée automatiquement à la création d''un student_fees (trigger) ou manuellement en cas de régénération.';

create or replace function trg_auto_generate_installments()
returns trigger
language plpgsql
as $$
begin
  perform generate_student_fee_installments(new.id);
  return new;
end;
$$;

create trigger trg_student_fees_generate_installments
  after insert on student_fees
  for each row execute function trg_auto_generate_installments();

-- ----------------------------------------------------------------------------
-- 4. RLS pour les nouvelles tables (même politique générique que le reste)
-- ----------------------------------------------------------------------------
alter table study_periods enable row level security;
create policy tenant_isolation_select on study_periods for select using (school_id = current_school_id() or is_platform_admin());
create policy tenant_isolation_write on study_periods for insert with check (school_id = current_school_id());
create policy tenant_isolation_update on study_periods for update using (school_id = current_school_id());

alter table fee_installment_templates enable row level security;
create policy tenant_isolation_select on fee_installment_templates for select using (school_id = current_school_id() or is_platform_admin());
create policy tenant_isolation_write on fee_installment_templates for insert with check (school_id = current_school_id());
create policy tenant_isolation_update on fee_installment_templates for update using (school_id = current_school_id());

-- ============================================================================
-- FIN ADDENDUM
-- Impact sur les écrans déjà maquettés (LIVRABLE 11) : l'écran "Paiement &
-- reçu" reste inchangé (il travaille sur student_fee_installments, quelle que
-- soit son origine mensuelle/trimestrielle/custom). Impact sur l'écran
-- "Fiche élève" : le libellé des tranches affichera 'Trimestre 1' ou
-- 'Palier 2' au lieu d'un mois, selon la périodicité du frais concerné —
-- aucun changement structurel nécessaire côté frontend.
-- ============================================================================
