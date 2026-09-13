'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createBankAccount(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('bank_accounts').insert({
    school_id: school.id,
    bank_name: String(formData.get('bank_name')),
    account_name: String(formData.get('account_name')),
    account_number: String(formData.get('account_number')),
    opening_balance: Number(formData.get('opening_balance') ?? 0)
  });

  if (error) throw new Error(`Impossible de créer le compte bancaire : ${error.message}`);
  revalidatePath('/dashboard/banques');
}

export async function toggleReconciled(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const reconciled = formData.get('reconciled') === 'true';

  const { error } = await supabase.from('bank_transactions').update({ reconciled }).eq('id', id);
  if (error) throw new Error(`Impossible de mettre à jour le rapprochement : ${error.message}`);
  revalidatePath('/dashboard/banques');
}
