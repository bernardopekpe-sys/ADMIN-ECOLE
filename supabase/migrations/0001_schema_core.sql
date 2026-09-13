-- ============================================================================
-- ERP SCOLAIRE MULTI-ÉTABLISSEMENTS — SCHÉMA POSTGRESQL / SUPABASE (LIVRABLE 7)
-- ============================================================================
-- Conventions :
--   - Toutes les tables métier portent school_id (isolation multi-tenant, RLS).
--   - Clés primaires en uuid (gen_random_uuid()).
--   - Montants en numeric(14,2), jamais en float.
--   - created_at / updated_at / created_by sur toutes les tables métier.
--   - Aucune colonne de mot de passe : l'authentification est gérée par
--     Supabase Auth (auth.users) ; user_profiles ne fait que référencer auth.users(id).
--   - Les politiques RLS détaillées font l'objet du LIVRABLE 8 (fichier séparé).
--     Ce fichier pose uniquement la structure + les contraintes d'intégrité.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TYPES ÉNUMÉRÉS
-- ----------------------------------------------------------------------------

create type enrollment_status as enum
  ('preinscrit','en_attente','inscrit','annule','transfere','exclu','termine');

create type payment_method as enum
  ('especes','cheque','virement','mobile_money','autre');

create type expense_status as enum
  ('brouillon','soumise','validee','payee','comptabilisee','rejetee','annulee');

create type entry_status as enum
  ('brouillon','validee','annulee');

create type cash_session_status as enum
  ('ouverte','cloturee');

create type gender as enum ('M','F');

create type document_owner_type as enum
  ('student','personnel','school','expense','payroll','other');

-- ============================================================================
-- 0. PLATEFORME (hors périmètre school_id — géré par le Super Administrateur)
-- ============================================================================

create table platform_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);
comment on table platform_admins is 'Super administrateurs plateforme, hors périmètre d''un établissement donné.';

create table schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                     -- utilisé dans la numérotation (REC-{code}-2026-000001)
  official_name text not null,
  short_name text,
  school_type text,                               -- ex: privé, public, confessionnel
  legal_status text,
  supervising_authority text,
  address text,
  district text,
  city text,
  commune text,
  province text,
  country text not null default 'Gabon',
  phone text,
  phone_secondary text,
  email text,
  website text,
  po_box text,
  admin_identifiers jsonb,                        -- identifiants administratifs divers (numéro d'agrément, NIF...)
  currency text not null default 'XAF',            -- FCFA
  timezone text not null default 'Africa/Libreville',
  logo_path text,                                  -- chemin Supabase Storage
  logo_mono_path text,
  signature_path text,
  primary_color text,
  header_text text,
  footer_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table schools is 'Un établissement scolaire (tenant). Toute donnée métier est rattachée à school_id.';

-- ============================================================================
-- 1. STRUCTURE PÉDAGOGIQUE
-- ============================================================================

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  label text not null,                             -- '2026-2027'
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  status text not null default 'active',           -- active | closed
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz not null default now(),
  constraint chk_academic_year_dates check (end_date > start_date),
  unique (school_id, label)
);
comment on table academic_years is 'Une année scolaire clôturée devient non modifiable (appliqué en RLS/trigger).';

create table cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                              -- maternelle, primaire, collège, lycée...
  display_order int not null default 0,
  is_active boolean not null default true,
  unique (school_id, name)
);

create table levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  cycle_id uuid not null references cycles(id) on delete restrict,
  name text not null,                              -- CP1, 6e, Terminale...
  display_order int not null default 0,
  is_active boolean not null default true,
  unique (school_id, cycle_id, name)
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  level_id uuid not null references levels(id) on delete restrict,
  cycle_id uuid not null references cycles(id) on delete restrict,
  name text not null,                              -- '6e A'
  capacity int,
  main_teacher_id uuid,                            -- FK vers personnel, ajoutée après création de personnel (voir §10)
  status text not null default 'active',           -- active | inactive
  created_at timestamptz not null default now(),
  unique (school_id, academic_year_id, name)
);
create index idx_classes_school_year on classes(school_id, academic_year_id);

-- ============================================================================
-- 2. ÉLÈVES & FAMILLES
-- ============================================================================

create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  registration_number text not null,               -- matricule, unique par établissement
  last_name text not null,
  first_names text not null,
  gender gender not null,
  birth_date date,
  birth_place text,
  nationality text,
  address text,
  photo_path text,
  notes text,
  status text not null default 'active',           -- active | inactive | transferred | graduated
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, registration_number)
);
create index idx_students_school on students(school_id);
create index idx_students_name on students(school_id, last_name, first_names);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  last_name text not null,
  first_names text not null,
  phone text,
  phone_secondary text,
  email text,
  address text,
  occupation text,
  created_at timestamptz not null default now()
);
create index idx_guardians_school on guardians(school_id);

create table student_guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  relationship text not null,                      -- père, mère, tuteur, oncle...
  is_legal_guardian boolean not null default false,
  is_financial_guardian boolean not null default false,
  unique (student_id, guardian_id)
);

create table student_class_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete restrict,
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  start_date date not null,
  end_date date,
  is_repeater boolean not null default false,
  change_reason text,                              -- redoublement, transfert, admission...
  created_at timestamptz not null default now()
);
create index idx_sch_student on student_class_history(student_id);

-- ============================================================================
-- 3. INSCRIPTIONS
-- ============================================================================

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete restrict,
  class_id uuid not null references classes(id) on delete restrict,
  enrollment_type text not null default 'reinscription', -- inscription | reinscription
  is_new boolean not null default false,
  is_repeater boolean not null default false,
  enrollment_date date not null default current_date,
  status enrollment_status not null default 'preinscrit',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (school_id, student_id, academic_year_id)
);
create index idx_enrollments_school_year on enrollments(school_id, academic_year_id);

-- ============================================================================
-- 4. SCOLARITÉ & FRAIS
-- ============================================================================

create table fee_types (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                              -- scolarité, cantine, transport...
  is_mandatory boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table fee_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  fee_type_id uuid not null references fee_types(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  cycle_id uuid references cycles(id),
  level_id uuid references levels(id),
  class_id uuid references classes(id),            -- affinage possible jusqu'à la classe
  amount numeric(14,2) not null check (amount >= 0),
  due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_fee_assignments_year on fee_assignments(school_id, academic_year_id);

create table student_fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  fee_assignment_id uuid not null references fee_assignments(id) on delete restrict,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  created_at timestamptz not null default now(),
  unique (student_id, fee_assignment_id)
);
create index idx_student_fees_student on student_fees(student_id);

create table student_fee_installments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_fee_id uuid not null references student_fees(id) on delete cascade,
  label text not null,                             -- 'Septembre 2026'
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  created_at timestamptz not null default now()
);
create index idx_installments_fee on student_fee_installments(student_fee_id);

create table fee_discounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_fee_id uuid not null references student_fees(id) on delete cascade,
  discount_type text not null,                     -- amount | percentage
  value numeric(14,2) not null check (value >= 0),
  reason text not null,
  status text not null default 'pending',          -- pending | approved | rejected
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. PAIEMENTS & REÇUS
-- ============================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payment_number text not null,                    -- PAI-{code}-2026-000001
  payment_date date not null default current_date,
  student_id uuid not null references students(id) on delete restrict,
  guardian_id uuid references guardians(id),
  payer_name text,                                 -- si payeur tiers non enregistré
  payer_phone text,
  amount numeric(14,2) not null check (amount > 0),
  payment_method payment_method not null,
  cash_register_id uuid,                           -- FK ajoutée après création de cash_registers (§6)
  bank_account_id uuid,
  status text not null default 'validated',        -- validated | cancelled
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (school_id, payment_number)
);
create index idx_payments_student on payments(student_id);
create index idx_payments_school_date on payments(school_id, payment_date);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  installment_id uuid not null references student_fee_installments(id) on delete restrict,
  amount_allocated numeric(14,2) not null check (amount_allocated > 0)
);
create index idx_allocations_payment on payment_allocations(payment_id);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  receipt_number text not null,                    -- REC-{code}-2026-000001
  payment_id uuid not null unique references payments(id) on delete restrict,
  amount_in_words text not null,
  reprint_count int not null default 0,
  last_reprinted_by uuid,
  last_reprinted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, receipt_number)
);

create table payment_cancellations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete restrict,
  reason text not null,
  requested_by uuid not null,
  approved_by uuid,
  status text not null default 'pending',          -- pending | approved | rejected
  reversal_entry_id uuid,                          -- FK vers accounting_entries (créée en §8)
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. TRÉSORERIE — CAISSE & BANQUE
-- ============================================================================

create table cash_registers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                              -- caisse principale, caisse administrative...
  is_active boolean not null default true,
  unique (school_id, name)
);

create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  cash_register_id uuid not null references cash_registers(id) on delete restrict,
  opened_by uuid not null,
  opened_at timestamptz not null default now(),
  opening_balance numeric(14,2) not null default 0,
  closed_by uuid,
  closed_at timestamptz,
  theoretical_balance numeric(14,2),
  physical_balance numeric(14,2),
  variance numeric(14,2),
  status cash_session_status not null default 'ouverte'
);
create index idx_cash_sessions_register on cash_sessions(cash_register_id);

create table cash_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  cash_session_id uuid not null references cash_sessions(id) on delete restrict,
  transaction_type text not null,                  -- in | out | transfer
  amount numeric(14,2) not null check (amount > 0),
  source_type text not null,                       -- payment | expense | other_income | transfer
  source_id uuid,
  description text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index idx_cash_tx_session on cash_transactions(cash_session_id);

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  opening_balance numeric(14,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table bank_transactions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  bank_account_id uuid not null references bank_accounts(id) on delete restrict,
  transaction_type text not null,                  -- deposit | withdrawal | transfer | bank_fee | inflow | outflow
  amount numeric(14,2) not null check (amount > 0),
  source_type text not null,
  source_id uuid,
  reconciled boolean not null default false,
  description text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index idx_bank_tx_account on bank_transactions(bank_account_id);

-- Ajout des FK différées maintenant que cash_registers/bank_accounts existent
alter table payments add constraint fk_payments_cash_register foreign key (cash_register_id) references cash_registers(id);
alter table payments add constraint fk_payments_bank_account foreign key (bank_account_id) references bank_accounts(id);

-- ============================================================================
-- 7. DÉPENSES & FOURNISSEURS
-- ============================================================================

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  company_name text not null,
  contact_name text,
  phone text,
  address text,
  admin_identifiers jsonb,
  supplier_type text,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  expense_number text not null,                    -- DEP-{code}-2026-000001
  expense_date date not null default current_date,
  supplier_id uuid references suppliers(id),
  beneficiary_name text,                            -- si non-fournisseur enregistré
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_method payment_method,
  cash_register_id uuid references cash_registers(id),
  bank_account_id uuid references bank_accounts(id),
  proof_document_path text,
  status expense_status not null default 'brouillon',
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (school_id, expense_number)
);
create index idx_expenses_school_status on expenses(school_id, status);

create table expense_approvals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  expense_id uuid not null references expenses(id) on delete cascade,
  approver_id uuid not null,                       -- toujours le Directeur (règle métier confirmée)
  decision text not null,                          -- approved | rejected
  comment text,
  decided_at timestamptz not null default now()
);
comment on table expense_approvals is 'Chaque dépense doit être validée par le Directeur (règle métier confirmée).';

-- ============================================================================
-- 8. COMPTABILITÉ (SYSCOHADA révisé)
-- ============================================================================

create table accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  account_number text not null,                    -- ex: 57 = caisse, 52 = banque, 70 = ventes (SYSCOHADA)
  label text not null,
  account_class int not null,                       -- classe SYSCOHADA 1 à 9
  parent_account_id uuid references accounting_accounts(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, account_number)
);
comment on table accounting_accounts is 'Plan comptable SYSCOHADA révisé, dupliqué et éditable par établissement à sa création.';

create table accounting_journals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  code text not null,                               -- CA, BQ, AC, VE, OD
  name text not null,
  unique (school_id, code)
);

create table accounting_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  entry_number text not null,                       -- OD-{code}-2026-000001
  entry_date date not null default current_date,
  journal_id uuid not null references accounting_journals(id) on delete restrict,
  source_type text not null,                        -- payment | expense | payroll | manual
  source_id uuid,
  description text not null,
  status entry_status not null default 'validee',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (school_id, entry_number)
);
create index idx_entries_school_date on accounting_entries(school_id, entry_date);

create table accounting_entry_lines (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  entry_id uuid not null references accounting_entries(id) on delete cascade,
  account_id uuid not null references accounting_accounts(id) on delete restrict,
  label text,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  constraint chk_line_single_side check (
    (debit > 0 and credit = 0) or (debit = 0 and credit > 0)
  )
);
create index idx_entry_lines_entry on accounting_entry_lines(entry_id);
create index idx_entry_lines_account on accounting_entry_lines(account_id);

-- Contrainte d'équilibre débit=crédit : appliquée par trigger AFTER INSERT/UPDATE/DELETE
-- sur accounting_entry_lines, qui vérifie SUM(debit)=SUM(credit) par entry_id avant que
-- l'écriture ne puisse passer au statut 'validee'. Détail de la fonction en LIVRABLE 8
-- (logique métier / fonctions PostgreSQL), aux côtés des politiques RLS.

-- Compléter les FK différées maintenant que accounting_entries existe
alter table payment_cancellations add constraint fk_cancel_entry foreign key (reversal_entry_id) references accounting_entries(id);

-- ============================================================================
-- 9. BUDGET
-- ============================================================================

create table budgets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  line_type text not null,                          -- revenue | expense
  category text not null,                           -- scolarité, salaires, eau, électricité...
  forecast_amount numeric(14,2) not null check (forecast_amount >= 0),
  created_at timestamptz not null default now()
);
-- Le "réalisé" n'est pas stocké : il est calculé par agrégation des
-- accounting_entry_lines sur la période, comparé ici au forecast_amount.

-- ============================================================================
-- 10. PERSONNEL & PAIE
-- ============================================================================

create table personnel (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  registration_number text not null,
  last_name text not null,
  first_names text not null,
  gender gender not null,
  role_function text not null,                      -- directeur, enseignant, comptable, gardien...
  category text,
  service text,
  subjects text[],                                  -- matières enseignées, si applicable
  status text not null default 'active',
  hire_date date,
  contract_type text,
  base_salary numeric(14,2) not null default 0,
  phone text,
  email text,
  address text,
  bank_details jsonb,
  payment_method payment_method,
  created_at timestamptz not null default now(),
  unique (school_id, registration_number)
);
create index idx_personnel_school on personnel(school_id);

alter table classes add constraint fk_classes_main_teacher foreign key (main_teacher_id) references personnel(id);

create table personnel_salary_history (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  base_salary numeric(14,2) not null check (base_salary >= 0),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now()
);
comment on table personnel_salary_history is 'Historique jamais écrasé : chaque changement de salaire ouvre une nouvelle ligne.';

create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  personnel_id uuid unique references personnel(id) on delete set null,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table user_profiles is 'Un compte = un seul établissement (règle confirmée). 1 personnel -> 0..1 user_profile.';

create table roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                               -- directeur, comptable, caissier...
  is_system_role boolean not null default false,     -- rôles standards créés à l'init de l'école
  unique (school_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,                             -- eleves, paiements, caisse, depenses...
  action text not null,                              -- consulter, creer, modifier, valider, annuler, exporter, imprimer, supprimer
  unique (module, action)
);

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table user_roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  unique (user_profile_id, role_id)
);

create table salary_elements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                               -- prime de rendement, indemnité de transport...
  element_type text not null,                       -- bonus | allowance
  nature text not null default 'fixed',              -- fixed | variable | exceptional | recurring
  is_active boolean not null default true,
  unique (school_id, name)
);

create table bonuses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  salary_element_id uuid not null references salary_elements(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  period date not null,                              -- mois concerné
  status text not null default 'pending',            -- pending | approved | rejected
  approved_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table advances (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  advance_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  reason text,
  cash_register_id uuid references cash_registers(id),
  bank_account_id uuid references bank_accounts(id),
  status text not null default 'pending',            -- pending | approved | integrated | rejected
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table personnel_loans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  loan_date date not null default current_date,
  reason text,
  installment_count int not null check (installment_count > 0),
  monthly_installment numeric(14,2) not null check (monthly_installment > 0),
  start_date date not null,
  status text not null default 'active',             -- active | closed
  created_at timestamptz not null default now()
);

create table loan_repayments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  loan_id uuid not null references personnel_loans(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  repayment_date date not null default current_date,
  payroll_item_id uuid                                -- lien vers la retenue de paie correspondante (voir plus bas)
);
-- Le solde restant d'un prêt = principal_amount - SUM(loan_repayments.amount) : calculé, jamais stocké en dur.

create table deduction_reasons (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                                -- absence non justifiée, retard cumulé, avance...
  is_active boolean not null default true,
  unique (school_id, name)
);

create table staff_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  absence_date date not null,
  duration text,                                     -- journée, demi-journée...
  justification text,
  status text not null default 'recorded',           -- recorded | justified | unjustified
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table staff_lateness (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete cascade,
  lateness_date date not null,
  lateness_time time,
  reason text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  label text not null,                                -- 'Septembre 2026'
  period_month date not null,                          -- premier jour du mois
  status text not null default 'preparation',          -- preparation | validated | paid | closed
  validated_by uuid,
  validated_at timestamptz,
  closed_at timestamptz,
  unique (school_id, period_month)
);

create table payrolls (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payroll_period_id uuid not null references payroll_periods(id) on delete cascade,
  personnel_id uuid not null references personnel(id) on delete restrict,
  base_salary numeric(14,2) not null,                  -- valeur figée au moment du calcul
  gross_total numeric(14,2) not null,
  deduction_total numeric(14,2) not null,
  net_pay numeric(14,2) not null,
  status text not null default 'draft',                -- draft | validated | paid
  paid_at timestamptz,
  payment_method payment_method,
  cash_register_id uuid references cash_registers(id),
  bank_account_id uuid references bank_accounts(id),
  created_at timestamptz not null default now(),
  unique (payroll_period_id, personnel_id)
);
comment on table payrolls is 'Valeurs figées à la génération : un changement ultérieur de barème ne modifie jamais un bulletin déjà généré.';

create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payroll_id uuid not null references payrolls(id) on delete cascade,
  item_type text not null,                             -- earning | deduction
  label text not null,
  amount numeric(14,2) not null check (amount >= 0),
  source_type text,                                     -- bonus | advance | loan_repayment | attendance | manual
  source_id uuid
);
create index idx_payroll_items_payroll on payroll_items(payroll_id);

alter table loan_repayments add constraint fk_loan_repayment_item foreign key (payroll_item_id) references payroll_items(id);

create table payroll_deductions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  deduction_reason_id uuid not null references deduction_reasons(id) on delete restrict,
  justification text,
  approved_by uuid,
  approved_at timestamptz
);

-- ============================================================================
-- 11. VIE SCOLAIRE
-- ============================================================================

create table student_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id) on delete restrict,
  absence_date date not null,
  duration text,
  reason text,
  is_justified boolean not null default false,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create index idx_student_attendance_student on student_attendance(student_id);

create table student_lateness (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  lateness_date date not null,
  lateness_time time,
  reason text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table disciplinary_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  incident_date date not null,
  description text not null,
  sanction text,
  observation text,
  guardian_summoned boolean not null default false,
  decision text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 12. EXAMENS (structure minimale V1, extensible en V5)
-- ============================================================================

create table examinations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,                                  -- CEP, BEPC, BAC, examen interne...
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table examination_candidates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  examination_id uuid not null references examinations(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  fee_amount numeric(14,2) default 0,
  status text not null default 'registered',
  missing_documents text,
  notes text,
  unique (examination_id, student_id)
);

-- ============================================================================
-- 13. TRANSVERSE — DOCUMENTS, AUDIT, NOTIFICATIONS, NUMÉROTATION
-- ============================================================================

create table documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_type document_owner_type not null,
  owner_id uuid,
  document_type text not null,                          -- acte_naissance, certificat, bulletin, justificatif...
  storage_path text not null,
  uploaded_by uuid not null,
  uploaded_at timestamptz not null default now()
);
create index idx_documents_owner on documents(owner_type, owner_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,                                        -- nullable pour les actions plateforme
  user_id uuid,
  action text not null,                                  -- create | update | delete | validate | cancel...
  module text not null,
  entity_table text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_audit_school_date on audit_logs(school_id, created_at);
comment on table audit_logs is 'Alimenté par triggers PostgreSQL sur les tables sensibles, pas par le frontend seul.';

create table notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  user_profile_id uuid not null references user_profiles(id) on delete cascade,
  title text not null,
  body text,
  category text not null,                                -- impaye | depense_attente | paie_a_valider | caisse_ouverte | document_manquant
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table numbering_sequences (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  document_type text not null,                           -- receipt | payment | expense | payroll | entry
  year int not null,
  last_number int not null default 0,
  unique (school_id, document_type, year)
);
comment on table numbering_sequences is 'Incrémentation via fonction PostgreSQL avec verrou (SELECT ... FOR UPDATE) pour éviter les doublons en accès concurrent.';

-- ============================================================================
-- FIN LIVRABLE 7 — 40 tables métier + 4 tables transverses + 2 tables plateforme
-- Suite : LIVRABLE 8 (politiques RLS + fonctions métier : numérotation, écritures
-- équilibrées, propagation paiement -> caisse -> comptabilité, moteur de paie).
-- ============================================================================
