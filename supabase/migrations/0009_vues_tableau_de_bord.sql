-- ============================================================================
-- ADDENDUM 6 — VUES D'AGRÉGATION POUR LE TABLEAU DE BORD (workflow n°30)
-- ============================================================================
-- Referme le TODO laissé dans dashboard/page.tsx depuis le début : le
-- tableau de santé financière (résultat / trésorerie / impayés, §50-52 du
-- document d'architecture) a besoin de vues, pas de requêtes ponctuelles
-- côté application. `security_invoker = true` est essentiel : sans lui, une
-- vue s'exécute avec les droits de son créateur (postgres), ce qui
-- contournerait silencieusement toute la RLS multi-tenant posée dans
-- 02-rls-et-fonctions.sql — chaque vue ci-dessous respecte donc les policies
-- de l'utilisateur qui l'interroge, exactement comme une requête directe.
-- ============================================================================

create view v_cash_balance
with (security_invoker = true) as
select
  cr.school_id,
  cr.id as cash_register_id,
  cr.name,
  coalesce(
    (
      select cs.opening_balance
             + coalesce(sum(ct.amount) filter (where ct.transaction_type = 'in'), 0)
             - coalesce(sum(ct.amount) filter (where ct.transaction_type = 'out'), 0)
      from cash_sessions cs
      left join cash_transactions ct on ct.cash_session_id = cs.id
      where cs.cash_register_id = cr.id and cs.status = 'ouverte'
      group by cs.id
      order by cs.opened_at desc
      limit 1
    ),
    (
      select cs.physical_balance
      from cash_sessions cs
      where cs.cash_register_id = cr.id and cs.status = 'cloturee'
      order by cs.closed_at desc
      limit 1
    ),
    0
  ) as balance
from cash_registers cr;
comment on view v_cash_balance is
  'Solde courant par caisse : celui de la session ouverte si elle existe, sinon le dernier solde physique clôturé, sinon zéro.';

create view v_bank_balance
with (security_invoker = true) as
select
  ba.school_id,
  ba.id as bank_account_id,
  ba.account_name,
  ba.opening_balance
    + coalesce(sum(bt.amount) filter (where bt.transaction_type in ('deposit', 'inflow')), 0)
    - coalesce(sum(bt.amount) filter (where bt.transaction_type in ('withdrawal', 'outflow', 'bank_fee')), 0)
    as balance
from bank_accounts ba
left join bank_transactions bt on bt.bank_account_id = ba.id
group by ba.id;

create view v_treasury_summary
with (security_invoker = true) as
select school_id, sum(balance) as total_treasury
from (
  select school_id, balance from v_cash_balance
  union all
  select school_id, balance from v_bank_balance
) t
group by school_id;
comment on view v_treasury_summary is
  'Trésorerie disponible = caisses + banques, jamais confondue avec le résultat comptable (§52 du document d''architecture).';

create view v_unpaid_installments
with (security_invoker = true) as
select
  sfi.school_id,
  count(*) filter (where sfi.amount_paid < sfi.amount_due) as unpaid_count,
  coalesce(sum(sfi.amount_due - sfi.amount_paid) filter (where sfi.amount_paid < sfi.amount_due), 0) as unpaid_total
from student_fee_installments sfi
group by sfi.school_id;

create view v_monthly_result
with (security_invoker = true) as
select
  ae.school_id,
  date_trunc('month', ae.entry_date)::date as month,
  coalesce(sum(ael.credit - ael.debit) filter (where aa.account_class = 7), 0) as recettes,
  coalesce(sum(ael.debit - ael.credit) filter (where aa.account_class = 6), 0) as depenses
from accounting_entries ae
join accounting_entry_lines ael on ael.entry_id = ae.id
join accounting_accounts aa on aa.id = ael.account_id
where ae.status = 'validee'
group by ae.school_id, date_trunc('month', ae.entry_date);
comment on view v_monthly_result is
  'Résultat comptable (recettes classe 7 - dépenses classe 6) par mois — distinct de la trésorerie (v_treasury_summary), conformément à la règle métier §52.';
