-- ============================================================================
-- ADDENDUM 7 — RETENUES ABSENCES/RETARDS : PROPOSITION PUIS VALIDATION
-- ============================================================================
-- Referme le dernier manque de generate_payroll() signalé dans le README :
-- les absences/retards non justifiés du personnel ne réduisaient pas encore
-- le salaire. Respecte strictement la règle métier §37 (et le workflow n°23) :
-- AUCUNE retenue n'est appliquée automatiquement — le système propose
-- seulement un montant, un humain (Comptable/Directeur) valide avant que ça
-- n'impacte le bulletin.
--
-- Mécanique : propose_attendance_deduction() crée un payroll_item de type
-- 'deduction' avec un montant calculé, ET une ligne payroll_deductions liée,
-- approved_by = null (en attente). Tant qu'elle n'est pas approuvée, le
-- montant n'est PAS inclus dans payrolls.deduction_total / net_pay.
-- approve_attendance_deduction() ne fait qu'à ce moment-là recalculer les
-- totaux du bulletin.
-- ============================================================================

create or replace function propose_attendance_deductions(p_payroll_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_payroll payrolls%rowtype;
  v_period_month date;
  v_daily_rate numeric(14,2);
  v_unjustified_days int;
  v_reason_id uuid;
  v_item_id uuid;
  v_amount numeric(14,2);
begin
  select * into v_payroll from payrolls where id = p_payroll_id;
  select period_month into v_period_month from payroll_periods where id = v_payroll.payroll_period_id;

  select count(*) into v_unjustified_days
  from staff_attendance
  where personnel_id = v_payroll.personnel_id
    and status = 'unjustified'
    and date_trunc('month', absence_date) = date_trunc('month', v_period_month);

  if v_unjustified_days = 0 then
    return; -- rien à proposer
  end if;

  v_daily_rate := v_payroll.base_salary / 30;
  v_amount := round(v_daily_rate * v_unjustified_days, 2);

  select id into v_reason_id from deduction_reasons
  where school_id = v_payroll.school_id and name = 'Absence non justifiée';
  if v_reason_id is null then
    insert into deduction_reasons (school_id, name) values (v_payroll.school_id, 'Absence non justifiée')
    returning id into v_reason_id;
  end if;

  insert into payroll_items (school_id, payroll_id, item_type, label, amount, source_type)
  values (v_payroll.school_id, p_payroll_id, 'deduction',
          format('Absences non justifiées (%s jour(s), en attente de validation)', v_unjustified_days),
          v_amount, 'staff_attendance')
  returning id into v_item_id;

  insert into payroll_deductions (school_id, payroll_item_id, deduction_reason_id, justification)
  values (v_payroll.school_id, v_item_id, v_reason_id,
          format('%s jour(s) d''absence non justifiée sur %s', v_unjustified_days, to_char(v_period_month, 'TMMonth YYYY')));

  -- Pas de mise à jour de payrolls.deduction_total / net_pay ici : cette
  -- proposition n'a aucun effet financier tant qu'elle n'est pas approuvée.
end;
$$;
comment on function propose_attendance_deductions is
  'Ne fait que proposer — aucune retenue définitive sans validation humaine (règle métier §37).';

create or replace function approve_attendance_deduction(p_payroll_deduction_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_deduction payroll_deductions%rowtype;
  v_item payroll_items%rowtype;
begin
  select * into v_deduction from payroll_deductions where id = p_payroll_deduction_id;

  if v_deduction.approved_by is not null then
    raise exception 'Cette retenue a déjà été validée.';
  end if;

  select * into v_item from payroll_items where id = v_deduction.payroll_item_id;

  update payroll_deductions set approved_by = auth.uid(), approved_at = now()
  where id = p_payroll_deduction_id;

  update payroll_items
  set label = replace(label, ' (en attente de validation)', '')
  where id = v_item.id;

  update payrolls
  set deduction_total = deduction_total + v_item.amount,
      net_pay = net_pay - v_item.amount
  where id = v_item.payroll_id;
end;
$$;
comment on function approve_attendance_deduction is
  'Seul ce moment fait entrer la retenue dans le net à payer — jamais generate_payroll ni propose_attendance_deductions.';
