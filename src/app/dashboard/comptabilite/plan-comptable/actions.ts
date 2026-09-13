'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createAccount(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('accounting_accounts').insert({
    school_id: school.id,
    account_number: String(formData.get('account_number')),
    label: String(formData.get('label')),
    account_class: Number(formData.get('account_class'))
  });

  if (error) throw new Error(`Impossible de créer le compte : ${error.message}`);
  revalidatePath('/dashboard/comptabilite/plan-comptable');
}
