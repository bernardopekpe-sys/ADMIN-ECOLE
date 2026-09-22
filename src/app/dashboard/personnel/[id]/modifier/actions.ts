'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updatePersonnel(formData: FormData) {
  const supabase = createClient();
  const personnel_id = String(formData.get('personnel_id'));

  const { error } = await supabase.from('personnel').update({
    registration_number: String(formData.get('registration_number')),
    gender: String(formData.get('gender')),
    last_name: String(formData.get('last_name')),
    first_names: String(formData.get('first_names')),
    role_function: String(formData.get('role_function')),
    category: String(formData.get('category') ?? '') || null,
    hire_date: String(formData.get('hire_date') ?? '') || null,
    contract_type: String(formData.get('contract_type') ?? '') || null,
    phone: String(formData.get('phone') ?? '') || null,
    email: String(formData.get('email') ?? '') || null
  }).eq('id', personnel_id);

  if (error) throw new Error(`Impossible de modifier la fiche : ${error.message}`);

  redirect(`/dashboard/personnel/${personnel_id}`);
}

// Désactivation, jamais suppression — un membre désactivé disparaît des
// listes actives mais son historique (salaires, paie, avances) reste intact.
export async function toggleActive(formData: FormData) {
  const supabase = createClient();
  const personnel_id = String(formData.get('personnel_id'));
  const new_status = String(formData.get('new_status'));

  const { error } = await supabase.from('personnel').update({ status: new_status }).eq('id', personnel_id);
  if (error) throw new Error(`Impossible de changer le statut : ${error.message}`);

  revalidatePath(`/dashboard/personnel/${personnel_id}/modifier`);
  redirect(`/dashboard/personnel/${personnel_id}/modifier`);
}
