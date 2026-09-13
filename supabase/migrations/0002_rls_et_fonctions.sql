-- ============================================================================
-- ERP SCOLAIRE — SÉCURITÉ RLS & FONCTIONS MÉTIER CENTRALES (LIVRABLE 8)
-- ============================================================================
-- Suite du LIVRABLE 7 (schéma). Ce fichier couvre :
--   A. Fonctions utilitaires de contexte (école courante, rôle, permission)
--   B. Activation RLS + politique générique multi-tenant sur toutes les tables
--   C. Politiques renforcées sur les tables sensibles (paie, salaires)
--   D. Fonctions métier centrales : numérotation atomique, écriture comptable
--      équilibrée, propagation paiement -> caisse/banque -> comptabilité,
--      clôture de caisse, calcul de paie
--   E. Triggers d'audit automatique
-- ============================================================================

-- ============================================================================
-- A. FONCTIONS DE CONTEXTE
-- ============================================================================

-- Retourne l'établissement de l'utilisateur connecté (un compte = un établissement).
create or replace function current_school_id()
returns uuid
language sql
stable
security definer
as $$
  select up.school_id
  from user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;
$$;

-- Retourne le user_profile.id de l'utilisateur connecté.
create or replace function current_user_profile_id()
returns uuid
language sql
stable
security definer
as $$
  select up.id
  from user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;
$$;

-- Retourne le personnel_id lié au compte connecté (utile pour "consulter sa propre fiche").
create or replace function current_personnel_id()
returns uuid
language sql
stable
security definer
as $$
  select up.personnel_id
  from user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;
$$;

-- Vrai si l'utilisateur connecté est Super Administrateur plateforme.
create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from platform_admins pa where pa.auth_user_id = auth.uid()
  );
$$;

-- Vrai si l'utilisateur connecté possède la permission (module, action) dans son établissement.
create or replace function has_permission(p_module text, p_action text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_profile_id = current_user_profile_id()
      and p.module = p_module
      and p.action = p_action
  );
$$;

comment on function has_permission is
  'Vérification granulaire module/action, alimentée par la table permissions paramétrable en base — jamais figée dans le code applicatif.';

-- ============================================================================
-- B. RLS GÉNÉRIQUE MULTI-TENANT
-- ============================================================================
-- Principe : toute table métier porte school_id ; l'accès en lecture/écriture
-- est limité à l'établissement de l'utilisateur connecté, OU au Super Admin
-- plateforme (lecture/diagnostic uniquement, jamais d'écriture silencieuse).
--
-- Pour éviter 45 blocs répétitifs, on active RLS et on pose une politique de
-- base (isolation par école) sur toutes les tables listées, via une boucle.
-- Les politiques d'ACTION plus fines (qui peut créer/valider/annuler quoi)
-- sont ensuite ajoutées explicitement table par table (section C et au-delà,
-- à compléter au fil du développement de chaque module).

do $$
declare
  t text;
  tenant_tables text[] := array[
    'academic_years','cycles','levels','classes',
    'students','guardians','student_guardians','student_class_history',
    'enrollments',
    'fee_types','fee_assignments','student_fees','student_fee_installments','fee_discounts',
    'payments','payment_allocations','receipts','payment_cancellations',
    'cash_registers','cash_sessions','cash_transactions',
    'bank_accounts','bank_transactions',
    'suppliers','expenses','expense_approvals',
    'accounting_accounts','accounting_journals','accounting_entries','accounting_entry_lines',
    'budgets',
    'personnel','personnel_salary_history','user_profiles','roles','user_roles',
    'salary_elements','bonuses','advances','personnel_loans','loan_repayments',
    'deduction_reasons','staff_attendance','staff_lateness',
    'payroll_periods','payrolls','payroll_items','payroll_deductions',
    'student_attendance','student_lateness','disciplinary_records',
    'examinations','examination_candidates',
    'documents','notifications','numbering_sequences'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security;', t);

    execute format($f$
      create policy tenant_isolation_select on %I
      for select
      using (school_id = current_school_id() or is_platform_admin());
    $f$, t);

    execute format($f$
      create policy tenant_isolation_write on %I
      for insert
      with check (school_id = current_school_id());
    $f$, t);

    execute format($f$
      create policy tenant_isolation_update on %I
      for update
      using (school_id = current_school_id())
      with check (school_id = current_school_id());
    $f$, t);
  end loop;
end $$;

comment on function current_school_id() is
  'Base de toute politique RLS : jamais de filtrage school_id géré côté frontend seul.';

-- roles et permissions : permissions est une table de référence globale (non tenant),
-- lisible par tous les utilisateurs authentifiés, modifiable seulement par un admin plateforme.
alter table permissions enable row level security;
create policy permissions_read_all on permissions for select using (auth.role() = 'authenticated');
create policy permissions_write_platform on permissions for all using (is_platform_admin()) with check (is_platform_admin());

alter table role_permissions enable row level security;
create policy role_permissions_tenant_select on role_permissions
  for select using (
    exists (select 1 from roles r where r.id = role_permissions.role_id and r.school_id = current_school_id())
  );
create policy role_permissions_tenant_write on role_permissions
  for all using (
    exists (select 1 from roles r where r.id = role_permissions.role_id and r.school_id = current_school_id())
  );

alter table schools enable row level security;
create policy schools_select on schools
  for select using (id = current_school_id() or is_platform_admin());
create policy schools_update_own on schools
  for update using (id = current_school_id() and has_permission('etablissement','modifier'));
create policy schools_platform_manage on schools
  for insert with check (is_platform_admin());

-- ============================================================================
-- C. POLITIQUES RENFORCÉES — DONNÉES SENSIBLES (PAIE, SALAIRES)
-- ============================================================================
-- Au-delà de l'isolation par école, la paie doit être restreinte :
--   - Comptable/Directeur : accès complet (préparation, validation)
--   - Un enseignant/employé : uniquement SES PROPRES bulletins
--   - Un caissier, la vie scolaire, etc. : aucun accès

drop policy if exists tenant_isolation_select on payrolls;
create policy payroll_select on payrolls
  for select using (
    school_id = current_school_id()
    and (
      has_permission('paie','consulter')
      or personnel_id = current_personnel_id()
    )
  );

drop policy if exists tenant_isolation_select on payroll_items;
create policy payroll_items_select on payroll_items
  for select using (
    exists (
      select 1 from payrolls p
      where p.id = payroll_items.payroll_id
        and p.school_id = current_school_id()
        and (has_permission('paie','consulter') or p.personnel_id = current_personnel_id())
    )
  );

drop policy if exists tenant_isolation_select on personnel_salary_history;
create policy salary_history_select on personnel_salary_history
  for select using (
    school_id = current_school_id()
    and (has_permission('personnel','consulter_salaire') or personnel_id = current_personnel_id())
  );

-- Écriture sur la paie réservée à ceux qui ont explicitement la permission "preparer"/"valider".
create policy payroll_write on payrolls
  for insert with check (school_id = current_school_id() and has_permission('paie','creer'));
create policy payroll_update on payrolls
  for update using (school_id = current_school_id() and has_permission('paie','modifier'));

-- Dépenses : la validation est réservée au Directeur (règle métier confirmée).
create policy expense_approval_director_only on expense_approvals
  for insert with check (
    school_id = current_school_id()
    and exists (
      select 1 from user_roles ur join roles r on r.id = ur.role_id
      where ur.user_profile_id = current_user_profile_id() and r.name = 'Directeur'
    )
  );

-- ============================================================================
-- D. FONCTIONS MÉTIER CENTRALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- D.1 Numérotation atomique (évite les doublons en accès concurrent)
-- ----------------------------------------------------------------------------
create or replace function get_next_number(p_school_id uuid, p_document_type text, p_year int)
returns text
language plpgsql
security definer
as $$
declare
  v_next int;
  v_school_code text;
  v_prefix text;
begin
  select code into v_school_code from schools where id = p_school_id;

  insert into numbering_sequences (school_id, document_type, year, last_number)
  values (p_school_id, p_document_type, p_year, 1)
  on conflict (school_id, document_type, year)
  do update set last_number = numbering_sequences.last_number + 1
  returning last_number into v_next;

  v_prefix := case p_document_type
    when 'receipt' then 'REC'
    when 'payment' then 'PAI'
    when 'expense' then 'DEP'
    when 'payroll' then 'PAY'
    when 'entry' then 'OD'
    else upper(p_document_type)
  end;

  return format('%s-%s-%s-%s', v_prefix, v_school_code, p_year, lpad(v_next::text, 6, '0'));
end;
$$;
comment on function get_next_number is
  'UPSERT atomique sur numbering_sequences : deux transactions concurrentes ne peuvent jamais obtenir le même numéro.';

-- ----------------------------------------------------------------------------
-- D.2 Écriture comptable équilibrée — point d'entrée unique
-- ----------------------------------------------------------------------------
-- p_lines : jsonb au format [{"account_number": "571100", "debit": 100000, "credit": 0, "label": "..."}]
create or replace function create_balanced_entry(
  p_school_id uuid,
  p_journal_code text,
  p_source_type text,
  p_source_id uuid,
  p_description text,
  p_lines jsonb
) returns uuid
language plpgsql
security definer
as $$
declare
  v_entry_id uuid;
  v_journal_id uuid;
  v_total_debit numeric(14,2) := 0;
  v_total_credit numeric(14,2) := 0;
  v_line jsonb;
  v_account_id uuid;
begin
  select id into v_journal_id from accounting_journals
    where school_id = p_school_id and code = p_journal_code;

  if v_journal_id is null then
    raise exception 'Journal comptable % introuvable pour cet établissement.', p_journal_code;
  end if;

  insert into accounting_entries (school_id, entry_number, journal_id, source_type, source_id, description, status, created_by)
  values (
    p_school_id,
    get_next_number(p_school_id, 'entry', extract(year from current_date)::int),
    v_journal_id, p_source_type, p_source_id, p_description, 'brouillon', auth.uid()
  )
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select id into v_account_id from accounting_accounts
      where school_id = p_school_id and account_number = v_line->>'account_number';

    if v_account_id is null then
      raise exception 'Compte comptable % introuvable.', v_line->>'account_number';
    end if;

    insert into accounting_entry_lines (school_id, entry_id, account_id, label, debit, credit)
    values (
      p_school_id, v_entry_id, v_account_id,
      coalesce(v_line->>'label', p_description),
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'credit')::numeric, 0)
    );

    v_total_debit := v_total_debit + coalesce((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + coalesce((v_line->>'credit')::numeric, 0);
  end loop;

  if v_total_debit <> v_total_credit then
    raise exception 'Écriture déséquilibrée : débit % différent de crédit %.', v_total_debit, v_total_credit;
  end if;

  update accounting_entries set status = 'validee' where id = v_entry_id;

  return v_entry_id;
end;
$$;
comment on function create_balanced_entry is
  'Point d''entrée UNIQUE pour toute écriture comptable. Aucun module (paiement, dépense, paie) n''insère directement dans accounting_entry_lines.';

-- ----------------------------------------------------------------------------
-- D.3 Propagation d'un paiement validé -> reçu -> caisse/banque -> comptabilité
-- ----------------------------------------------------------------------------
create or replace function process_student_payment(
  p_payment_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_payment payments%rowtype;
  v_receipt_number text;
  v_cash_account text := '571100';   -- Caisse (SYSCOHADA)
  v_bank_account text := '521100';   -- Banque
  v_revenue_account text := '706100'; -- Produits de scolarité (à affiner par fee_type si besoin)
  v_entry_id uuid;
begin
  select * into v_payment from payments where id = p_payment_id;

  -- 1. Reçu
  v_receipt_number := get_next_number(v_payment.school_id, 'receipt', extract(year from v_payment.payment_date)::int);
  insert into receipts (school_id, receipt_number, payment_id, amount_in_words)
  values (v_payment.school_id, v_receipt_number, p_payment_id, '');  -- montant en lettres généré côté application

  -- 2. Mouvement de trésorerie (caisse ou banque selon le mode)
  if v_payment.cash_register_id is not null then
    insert into cash_transactions (school_id, cash_session_id, transaction_type, amount, source_type, source_id, created_by)
    select v_payment.school_id, cs.id, 'in', v_payment.amount, 'payment', p_payment_id, v_payment.created_by
    from cash_sessions cs
    where cs.cash_register_id = v_payment.cash_register_id and cs.status = 'ouverte'
    limit 1;
  elsif v_payment.bank_account_id is not null then
    insert into bank_transactions (school_id, bank_account_id, transaction_type, amount, source_type, source_id, created_by)
    values (v_payment.school_id, v_payment.bank_account_id, 'inflow', v_payment.amount, 'payment', p_payment_id, v_payment.created_by);
  end if;

  -- 3. Écriture comptable équilibrée
  v_entry_id := create_balanced_entry(
    v_payment.school_id, 'CA', 'payment', p_payment_id,
    format('Encaissement scolarité - %s', v_payment.payment_number),
    jsonb_build_array(
      jsonb_build_object('account_number', case when v_payment.cash_register_id is not null then v_cash_account else v_bank_account end,
                          'debit', v_payment.amount, 'credit', 0),
      jsonb_build_object('account_number', v_revenue_account, 'debit', 0, 'credit', v_payment.amount)
    )
  );

  -- 4. Mise à jour de l'échéancier via payment_allocations (déjà saisi en amont côté application)
  update student_fee_installments sfi
  set amount_paid = amount_paid + pa.amount_allocated
  from payment_allocations pa
  where pa.installment_id = sfi.id and pa.payment_id = p_payment_id;
end;
$$;
comment on function process_student_payment is
  'Chaîne complète paiement -> reçu -> trésorerie -> comptabilité -> échéancier, en une seule transaction. Appelée juste après la validation du paiement, jamais reconstruite manuellement module par module.';

-- ----------------------------------------------------------------------------
-- D.4 Clôture de caisse — calcul automatique de l'écart
-- ----------------------------------------------------------------------------
create or replace function close_cash_session(p_session_id uuid, p_physical_balance numeric)
returns void
language plpgsql
security definer
as $$
declare
  v_total_in numeric(14,2);
  v_total_out numeric(14,2);
  v_session cash_sessions%rowtype;
  v_theoretical numeric(14,2);
begin
  select * into v_session from cash_sessions where id = p_session_id;

  select coalesce(sum(amount) filter (where transaction_type = 'in'), 0),
         coalesce(sum(amount) filter (where transaction_type = 'out'), 0)
  into v_total_in, v_total_out
  from cash_transactions where cash_session_id = p_session_id;

  v_theoretical := v_session.opening_balance + v_total_in - v_total_out;

  update cash_sessions
  set status = 'cloturee',
      closed_by = auth.uid(),
      closed_at = now(),
      theoretical_balance = v_theoretical,
      physical_balance = p_physical_balance,
      variance = p_physical_balance - v_theoretical
  where id = p_session_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- D.5 Moteur de calcul de paie (structure — le détail des retenues métier
--     spécifiques au Gabon/SYSCOHADA social sera affiné avec vous en V3)
-- ----------------------------------------------------------------------------
create or replace function generate_payroll(p_period_id uuid, p_personnel_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_school_id uuid;
  v_base_salary numeric(14,2);
  v_bonus_total numeric(14,2);
  v_deduction_total numeric(14,2);
  v_gross numeric(14,2);
  v_net numeric(14,2);
  v_payroll_id uuid;
  v_period_month date;
begin
  select pp.school_id, pp.period_month into v_school_id, v_period_month
  from payroll_periods pp where pp.id = p_period_id;

  select base_salary into v_base_salary from personnel where id = p_personnel_id;

  select coalesce(sum(amount), 0) into v_bonus_total
  from bonuses
  where personnel_id = p_personnel_id and status = 'approved'
    and date_trunc('month', period) = date_trunc('month', v_period_month);

  v_gross := v_base_salary + v_bonus_total;

  -- Retenues : avances validées non encore intégrées + échéances de prêt du mois
  select coalesce(sum(amount), 0) into v_deduction_total
  from advances
  where personnel_id = p_personnel_id and status = 'approved';

  v_deduction_total := v_deduction_total + coalesce((
    select monthly_installment from personnel_loans
    where personnel_id = p_personnel_id and status = 'active'
    limit 1
  ), 0);

  v_net := v_gross - v_deduction_total;

  insert into payrolls (school_id, payroll_period_id, personnel_id, base_salary, gross_total, deduction_total, net_pay, status)
  values (v_school_id, p_period_id, p_personnel_id, v_base_salary, v_gross, v_deduction_total, v_net, 'draft')
  returning id into v_payroll_id;

  insert into payroll_items (school_id, payroll_id, item_type, label, amount)
  values (v_school_id, v_payroll_id, 'earning', 'Salaire de base', v_base_salary);

  if v_bonus_total > 0 then
    insert into payroll_items (school_id, payroll_id, item_type, label, amount)
    values (v_school_id, v_payroll_id, 'earning', 'Primes et bonus', v_bonus_total);
  end if;

  if v_deduction_total > 0 then
    insert into payroll_items (school_id, payroll_id, item_type, label, amount)
    values (v_school_id, v_payroll_id, 'deduction', 'Retenues (avances/prêts)', v_deduction_total);
  end if;

  return v_payroll_id;
end;
$$;
comment on function generate_payroll is
  'Version V1 simplifiée : primes approuvées + avances/prêts en cours. Les retenues absences/retards et charges sociales seront ajoutées en V3 après validation du barème social avec vous.';

-- ============================================================================
-- E. AUDIT AUTOMATIQUE
-- ============================================================================
create or replace function audit_trigger_fn()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into audit_logs (school_id, user_id, action, module, entity_table, entity_id, old_value, new_value)
  values (
    coalesce(new.school_id, old.school_id),
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- Appliqué sur les tables sensibles/critiques (liste à étendre selon vos priorités) :
do $$
declare
  t text;
  audited_tables text[] := array[
    'payments','payment_cancellations','expenses','expense_approvals',
    'accounting_entries','accounting_entry_lines',
    'payrolls','personnel_salary_history','advances','personnel_loans',
    'fee_discounts','academic_years'
  ];
begin
  foreach t in array audited_tables loop
    execute format('
      create trigger trg_audit_%1$s
      after insert or update or delete on %1$I
      for each row execute function audit_trigger_fn();
    ', t);
  end loop;
end $$;

-- ============================================================================
-- FIN LIVRABLE 8
-- Reste à faire au fil du développement de chaque module (pas bloquant pour
-- démarrer le V1) :
--   - Policies d'action fines (qui peut annuler un paiement, valider une
--     retenue...) au fur et à mesure que chaque écran est construit
--   - Vue restreinte des salaires (colonnes masquées) si vous voulez qu'un
--     Directeur voie la masse salariale sans voir le détail nominatif
--   - Barème des charges sociales gabonaises pour finaliser generate_payroll
-- ============================================================================
