'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createExpense(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const year = new Date().getFullYear();
  const { data: expenseNumber, error: numError } = await supabase.rpc('get_next_number', {
    p_school_id: school.id, p_document_type: 'expense', p_year: year
  });
  if (numError) throw new Error(`Numérotation impossible : ${numError.message}`);

  const supplier_id = String(formData.get('supplier_id') ?? '') || null;

  const { data: expense, error } = await supabase.from('expenses').insert({
    school_id: school.id,
    expense_number: expenseNumber,
    supplier_id,
    beneficiary_name: String(formData.get('beneficiary_name') ?? '') || null,
    category: String(formData.get('category')),
    amount: Number(formData.get('amount')),
    status: 'brouillon',
    created_by: auth.user?.id
  }).select('id').single();

  if (error) throw new Error(`Impossible de créer la dépense : ${error.message}`);

  redirect(`/dashboard/depenses/${expense.id}`);
}

export async function submitExpense(formData: FormData) {
  const supabase = createClient();
  const expense_id = String(formData.get('expense_id'));

  const { error } = await supabase.from('expenses').update({ status: 'soumise' }).eq('id', expense_id);
  if (error) throw new Error(`Impossible de soumettre la dépense : ${error.message}`);
  revalidatePath(`/dashboard/depenses/${expense_id}`);
}

export async function approveExpense(formData: FormData) {
  const supabase = createClient();
  const expense_id = String(formData.get('expense_id'));
  const { data: auth } = await supabase.auth.getUser();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  // RLS (expense_approval_director_only) refuse cet insert si le compte
  // connecté ne porte pas le rôle Directeur — indépendamment de ce que
  // montre l'écran.
  const { error: approvalError } = await supabase.from('expense_approvals').insert({
    school_id: school.id, expense_id, approver_id: auth.user?.id, decision: 'approved'
  });
  if (approvalError) throw new Error(`Validation refusée : ${approvalError.message}`);

  const { error } = await supabase.from('expenses').update({ status: 'validee' }).eq('id', expense_id);
  if (error) throw new Error(`Impossible de mettre à jour le statut : ${error.message}`);

  revalidatePath(`/dashboard/depenses/${expense_id}`);
}

export async function rejectExpense(formData: FormData) {
  const supabase = createClient();
  const expense_id = String(formData.get('expense_id'));
  const { data: auth } = await supabase.auth.getUser();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error: approvalError } = await supabase.from('expense_approvals').insert({
    school_id: school.id, expense_id, approver_id: auth.user?.id, decision: 'rejected'
  });
  if (approvalError) throw new Error(`Action refusée : ${approvalError.message}`);

  const { error } = await supabase.from('expenses').update({ status: 'rejetee' }).eq('id', expense_id);
  if (error) throw new Error(`Impossible de mettre à jour le statut : ${error.message}`);

  revalidatePath(`/dashboard/depenses/${expense_id}`);
}

export async function payExpense(formData: FormData) {
  const supabase = createClient();
  const expense_id = String(formData.get('expense_id'));
  const cash_session_id = String(formData.get('cash_session_id') ?? '') || null;
  const bank_account_id = String(formData.get('bank_account_id') ?? '') || null;

  if (!cash_session_id && !bank_account_id) {
    throw new Error('Choisissez une caisse ou un compte bancaire pour payer cette dépense.');
  }

  // process_expense_payment() enchaîne trésorerie -> écriture comptable ->
  // statut comptabilisée en une seule transaction (0006_comptabilite_seed.sql §B).
  const { error } = await supabase.rpc('process_expense_payment', {
    p_expense_id: expense_id,
    p_cash_session_id: cash_session_id,
    p_bank_account_id: bank_account_id
  });

  if (error) throw new Error(`Impossible de payer cette dépense : ${error.message}`);
  revalidatePath(`/dashboard/depenses/${expense_id}`);
}
