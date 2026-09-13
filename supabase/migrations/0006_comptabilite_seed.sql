-- ============================================================================
-- ADDENDUM 3 — SEED COMPTABLE PAR ÉTABLISSEMENT & PAIEMENT DES DÉPENSES
-- ============================================================================
-- Sans ce seed, create_balanced_entry() et process_student_payment() échouent
-- ("Journal comptable CA introuvable...") car accounting_journals et
-- accounting_accounts sont vides à la création d'un établissement.
-- Ce fichier ajoute :
--   A. initialize_default_accounting(school_id) — journaux + plan comptable
--      minimal SYSCOHADA, à appeler juste après initialize_default_roles()
--      dans ONBOARDING.md
--   B. process_expense_payment() — pendant de process_student_payment() côté
--      dépenses (workflow n°13 dans 06-workflows.md)
-- ============================================================================

create or replace function initialize_default_accounting(p_school_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into accounting_journals (school_id, code, name) values
    (p_school_id, 'CA', 'Journal de caisse'),
    (p_school_id, 'BQ', 'Journal de banque'),
    (p_school_id, 'AC', 'Journal des achats'),
    (p_school_id, 'VE', 'Journal des ventes / recettes'),
    (p_school_id, 'OD', 'Opérations diverses')
  on conflict (school_id, code) do nothing;

  -- Plan comptable minimal SYSCOHADA révisé — suffisant pour que le moteur
  -- fonctionne dès le V1 (trésorerie, recettes scolaires, charges courantes,
  -- dette personnel). À compléter/affiner avec le comptable de l'établissement
  -- depuis l'écran Comptabilité > Plan comptable.
  insert into accounting_accounts (school_id, account_number, label, account_class) values
    (p_school_id, '521100', 'Banque', 5),
    (p_school_id, '571100', 'Caisse', 5),
    (p_school_id, '401000', 'Fournisseurs', 4),
    (p_school_id, '421000', 'Personnel — rémunérations dues', 4),
    (p_school_id, '601000', 'Achats de fournitures', 6),
    (p_school_id, '604000', 'Fournitures administratives', 6),
    (p_school_id, '605000', 'Entretien et réparations', 6),
    (p_school_id, '606100', 'Eau et électricité', 6),
    (p_school_id, '628000', 'Charges diverses', 6),
    (p_school_id, '661000', 'Charges de personnel', 6),
    (p_school_id, '706100', 'Produits de scolarité', 7),
    (p_school_id, '706200', 'Produits — cantine', 7),
    (p_school_id, '706300', 'Produits — transport', 7)
  on conflict (school_id, account_number) do nothing;
end;
$$;
comment on function initialize_default_accounting is
  'À appeler une seule fois à la création d''un établissement, juste après initialize_default_roles(). Voir ONBOARDING.md.';

-- ----------------------------------------------------------------------------
-- B. Paiement d'une dépense validée -> caisse/banque -> comptabilité
-- ----------------------------------------------------------------------------
create or replace function process_expense_payment(
  p_expense_id uuid,
  p_cash_session_id uuid default null,
  p_bank_account_id uuid default null
) returns void
language plpgsql
security definer
as $$
declare
  v_expense expenses%rowtype;
  v_cash_account text := '571100';
  v_bank_account text := '521100';
  v_charge_account text := '628000';  -- TODO : dériver de v_expense.category via une table
                                       -- de correspondance catégorie -> compte, une fois
                                       -- le plan comptable affiné avec le comptable.
  v_cash_register_id uuid;
begin
  select * into v_expense from expenses where id = p_expense_id;

  if v_expense.status <> 'validee' then
    raise exception 'Seule une dépense validée par le Directeur peut être payée (statut actuel : %).', v_expense.status;
  end if;

  if p_cash_session_id is not null then
    select cash_register_id into v_cash_register_id from cash_sessions where id = p_cash_session_id;

    insert into cash_transactions (school_id, cash_session_id, transaction_type, amount, source_type, source_id, created_by)
    values (v_expense.school_id, p_cash_session_id, 'out', v_expense.amount, 'expense', p_expense_id, v_expense.created_by);

    update expenses set cash_register_id = v_cash_register_id where id = p_expense_id;
  elsif p_bank_account_id is not null then
    insert into bank_transactions (school_id, bank_account_id, transaction_type, amount, source_type, source_id, created_by)
    values (v_expense.school_id, p_bank_account_id, 'outflow', v_expense.amount, 'expense', p_expense_id, v_expense.created_by);

    update expenses set bank_account_id = p_bank_account_id where id = p_expense_id;
  else
    raise exception 'Préciser une session de caisse ou un compte bancaire pour payer cette dépense.';
  end if;

  perform create_balanced_entry(
    v_expense.school_id, 'AC', 'expense', p_expense_id,
    format('Dépense %s - %s', v_expense.expense_number, v_expense.category),
    jsonb_build_array(
      jsonb_build_object('account_number', v_charge_account, 'debit', v_expense.amount, 'credit', 0),
      jsonb_build_object('account_number', case when p_cash_session_id is not null then v_cash_account else v_bank_account end,
                          'debit', 0, 'credit', v_expense.amount)
    )
  );

  update expenses set status = 'comptabilisee' where id = p_expense_id;
end;
$$;
comment on function process_expense_payment is
  'Enchaîne trésorerie -> écriture comptable -> statut comptabilisée, en une seule transaction, sur le modèle de process_student_payment().';
