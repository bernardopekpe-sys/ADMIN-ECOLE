-- ============================================================================
-- ADDENDUM 5 — V5 : PÉDAGOGIE (MINIMALE), STOCK, CANTINE
-- ============================================================================
-- Complète le schéma pour les modules V5 du plan de développement, absents
-- du LIVRABLE 7 initial (le cahier des charges les qualifiait lui-même de
-- "développables progressivement", §43). Portée volontairement minimale :
-- suffisant pour être utilisable, pas un module pédagogique complet
-- (pas de coefficients par matière composés, pas de bulletins PDF ici —
-- à enrichir plus tard si besoin réel).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. PÉDAGOGIE
-- ----------------------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  unique (school_id, name)
);

create table class_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  personnel_id uuid references personnel(id),  -- enseignant assigné, optionnel
  coefficient numeric(4,2) not null default 1,
  unique (class_id, subject_id)
);

create table evaluations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  class_subject_id uuid not null references class_subjects(id) on delete cascade,
  study_period_id uuid references study_periods(id),
  label text not null,                          -- 'Devoir 1', 'Composition'...
  eval_date date not null default current_date,
  max_score numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  evaluation_id uuid not null references evaluations(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score numeric(5,2) check (score >= 0),
  created_at timestamptz not null default now(),
  unique (evaluation_id, student_id)
);

-- ----------------------------------------------------------------------------
-- B. STOCK
-- ----------------------------------------------------------------------------
create table stock_categories (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  unique (school_id, name)
);

create table stock_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  category_id uuid references stock_categories(id),
  name text not null,
  unit text not null default 'unité',
  min_quantity numeric(10,2) not null default 0,
  current_quantity numeric(10,2) not null default 0,  -- tenue à jour par trigger sur stock_movements
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  item_id uuid not null references stock_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out')),
  quantity numeric(10,2) not null check (quantity > 0),
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create or replace function apply_stock_movement()
returns trigger
language plpgsql
as $$
begin
  update stock_items
  set current_quantity = current_quantity + case when new.movement_type = 'in' then new.quantity else -new.quantity end
  where id = new.item_id;
  return new;
end;
$$;

create trigger trg_stock_movement
  after insert on stock_movements
  for each row execute function apply_stock_movement();

-- ----------------------------------------------------------------------------
-- C. CANTINE
-- ----------------------------------------------------------------------------
-- Les tarifs et paiements de cantine réutilisent volontairement le module
-- Frais existant (fee_types/fee_assignments/payments) plutôt que de dupliquer
-- un circuit financier parallèle — conforme à la règle métier "une donnée
-- n'est saisie qu'une fois" (§4.7). Seules l'inscription et la présence
-- quotidienne, propres à la cantine, sont modélisées ici.
create table cantine_subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

create table cantine_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  attendance_date date not null default current_date,
  created_by uuid,
  unique (student_id, attendance_date)
);

-- ----------------------------------------------------------------------------
-- D. RLS générique (même principe que 02-rls-et-fonctions.sql §B)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  new_tables text[] := array[
    'subjects','class_subjects','evaluations','grades',
    'stock_categories','stock_items','stock_movements',
    'cantine_subscriptions','cantine_attendance'
  ];
begin
  foreach t in array new_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      create policy tenant_isolation_select on %I
      for select using (school_id = current_school_id() or is_platform_admin());
    $f$, t);
    execute format($f$
      create policy tenant_isolation_write on %I
      for insert with check (school_id = current_school_id());
    $f$, t);
    execute format($f$
      create policy tenant_isolation_update on %I
      for update using (school_id = current_school_id());
    $f$, t);
  end loop;
end $$;
