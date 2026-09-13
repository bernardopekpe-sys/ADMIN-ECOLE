'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createPeriod(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('payroll_periods').insert({
    school_id: school.id,
    label: String(formData.get('label')),
    period_month: String(formData.get('period_month'))
  });

  if (error) throw new Error(`Impossible de créer la période : ${error.message}`);
  revalidatePath('/dashboard/paie');
}

export async function generateForAllPersonnel(formData: FormData) {
  const supabase = createClient();
  const period_id = String(formData.get('period_id'));

  const { data: personnel } = await supabase.from('personnel').select('id').eq('status', 'active');

  // generate_payroll() est appelée une fois par personnel — pas de version
  // "batch" côté base pour l'instant, cf. limite notée dans le README.
  for (const p of personnel ?? []) {
    const { error } = await supabase.rpc('generate_payroll', { p_period_id: period_id, p_personnel_id: p.id });
    if (error) {
      // On continue les autres plutôt que d'interrompre tout le lot sur une erreur isolée.
      console.error(`generate_payroll a échoué pour ${p.id} :`, error.message);
    }
  }

  revalidatePath(`/dashboard/paie/${period_id}`);
}

export async function validatePeriod(formData: FormData) {
  const supabase = createClient();
  const period_id = String(formData.get('period_id'));

  const { error } = await supabase.rpc('validate_payroll_period', { p_period_id: period_id });
  if (error) throw new Error(`Impossible de valider la période : ${error.message}`);

  revalidatePath(`/dashboard/paie/${period_id}`);
}

export async function proposeDeductions(formData: FormData) {
  const supabase = createClient();
  const period_id = String(formData.get('period_id'));

  const { data: payrolls } = await supabase.from('payrolls').select('id').eq('payroll_period_id', period_id);

  for (const p of payrolls ?? []) {
    const { error } = await supabase.rpc('propose_attendance_deductions', { p_payroll_id: p.id });
    if (error) console.error(`propose_attendance_deductions a échoué pour ${p.id} :`, error.message);
  }

  revalidatePath(`/dashboard/paie/${period_id}`);
}

export async function approveDeduction(formData: FormData) {
  const supabase = createClient();
  const deduction_id = String(formData.get('deduction_id'));

  const { error } = await supabase.rpc('approve_attendance_deduction', { p_payroll_deduction_id: deduction_id });
  if (error) throw new Error(`Impossible de valider cette retenue : ${error.message}`);

  revalidatePath('/dashboard/paie');
}
export async function payPayroll(formData: FormData) {
  const supabase = createClient();
  const payroll_id = String(formData.get('payroll_id'));
  const cash_session_id = String(formData.get('cash_session_id') ?? '') || null;
  const bank_account_id = String(formData.get('bank_account_id') ?? '') || null;

  if (!cash_session_id && !bank_account_id) {
    throw new Error('Choisissez une caisse ou un compte bancaire.');
  }

  const { error } = await supabase.rpc('process_payroll_payment', {
    p_payroll_id: payroll_id, p_cash_session_id: cash_session_id, p_bank_account_id: bank_account_id
  });
  if (error) throw new Error(`Impossible de payer ce bulletin : ${error.message}`);

  revalidatePath('/dashboard/paie');
}
