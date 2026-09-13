-- ============================================================================
-- ADDENDUM 4 — COMPTABILISATION DE LA PAIE (workflow n°25, 27, 28)
-- ============================================================================
-- Ajoute le compte 425000 (avances/prêts au personnel — utilisé pour solder
-- les retenues liées aux avances/prêts sans les confondre avec la charge de
-- personnel elle-même), et les deux fonctions qui manquaient pour boucler la
-- chaîne "préparation -> validation -> paiement -> comptabilité" décrite dans
-- 06-workflows.md (n°25 à 28).
-- ============================================================================

-- Ajout rétroactif pour les établissements déjà initialisés via 0006 :
insert into accounting_accounts (school_id, account_number, label, account_class)
select id, '425000', 'Avances et prêts au personnel', 4 from schools
on conflict (school_id, account_number) do nothing;

-- Mise à jour de la fonction de seed pour les futurs établissements :
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

  insert into accounting_accounts (school_id, account_number, label, account_class) values
    (p_school_id, '521100', 'Banque', 5),
    (p_school_id, '571100', 'Caisse', 5),
    (p_school_id, '401000', 'Fournisseurs', 4),
    (p_school_id, '421000', 'Personnel — rémunérations dues', 4),
    (p_school_id, '425000', 'Avances et prêts au personnel', 4),
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

-- ----------------------------------------------------------------------------
-- Validation d'une période de paie : constate la charge + la dette pour
-- chaque bulletin en 'draft' (workflow n°25/28). Valeurs figées à cet instant
-- — un changement ultérieur de barème ne modifie jamais ces montants.
-- ----------------------------------------------------------------------------
create or replace function validate_payroll_period(p_period_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_payroll record;
begin
  for v_payroll in select * from payrolls where payroll_period_id = p_period_id and status = 'draft'
  loop
    perform create_balanced_entry(
      v_payroll.school_id, 'OD', 'payroll', v_payroll.id,
      format('Paie %s — dette envers le personnel', v_payroll.id),
      jsonb_build_array(
        jsonb_build_object('account_number', '661000', 'debit', v_payroll.gross_total, 'credit', 0),
        jsonb_build_object('account_number', '425000', 'debit', 0, 'credit', v_payroll.deduction_total),
        jsonb_build_object('account_number', '421000', 'debit', 0, 'credit', v_payroll.net_pay)
      )
    );

    update payrolls set status = 'validated' where id = v_payroll.id;
  end loop;

  update payroll_periods set status = 'validated', validated_by = auth.uid(), validated_at = now()
  where id = p_period_id;
end;
$$;
comment on function validate_payroll_period is
  'Le débit (661000, charge totale) est réparti entre le crédit 425000 (retenues avances/prêts, soldées) et 421000 (dette nette réellement due) — la ligne reste équilibrée quel que soit le detail des retenues.';

-- ----------------------------------------------------------------------------
-- Paiement effectif d'un bulletin validé -> caisse/banque -> comptabilité
-- (workflow n°27/28)
-- ----------------------------------------------------------------------------
create or replace function process_payroll_payment(
  p_payroll_id uuid,
  p_cash_session_id uuid default null,
  p_bank_account_id uuid default null
) returns void
language plpgsql
security definer
as $$
declare
  v_payroll payrolls%rowtype;
begin
  select * into v_payroll from payrolls where id = p_payroll_id;

  if v_payroll.status <> 'validated' then
    raise exception 'Seul un bulletin validé peut être payé (statut actuel : %).', v_payroll.status;
  end if;

  if p_cash_session_id is not null then
    insert into cash_transactions (school_id, cash_session_id, transaction_type, amount, source_type, source_id, created_by)
    values (v_payroll.school_id, p_cash_session_id, 'out', v_payroll.net_pay, 'payroll', p_payroll_id, auth.uid());
  elsif p_bank_account_id is not null then
    insert into bank_transactions (school_id, bank_account_id, transaction_type, amount, source_type, source_id, created_by)
    values (v_payroll.school_id, p_bank_account_id, 'outflow', v_payroll.net_pay, 'payroll', p_payroll_id, auth.uid());
  else
    raise exception 'Préciser une caisse ou un compte bancaire pour payer ce bulletin.';
  end if;

  perform create_balanced_entry(
    v_payroll.school_id, case when p_cash_session_id is not null then 'CA' else 'BQ' end,
    'payroll', p_payroll_id,
    format('Règlement salaire — bulletin %s', p_payroll_id),
    jsonb_build_array(
      jsonb_build_object('account_number', '421000', 'debit', v_payroll.net_pay, 'credit', 0),
      jsonb_build_object('account_number', case when p_cash_session_id is not null then '571100' else '521100' end,
                          'debit', 0, 'credit', v_payroll.net_pay)
    )
  );

  update payrolls set status = 'paid', paid_at = now() where id = p_payroll_id;
end;
$$;
