'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createPersonnel(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const base_salary = Number(formData.get('base_salary'));

  const { data: personnel, error } = await supabase.from('personnel').insert({
    school_id: school.id,
    registration_number: String(formData.get('registration_number')),
    gender: String(formData.get('gender')),
    last_name: String(formData.get('last_name')),
    first_names: String(formData.get('first_names')),
    role_function: String(formData.get('role_function')),
    category: String(formData.get('category') ?? '') || null,
    hire_date: String(formData.get('hire_date') ?? '') || null,
    contract_type: String(formData.get('contract_type') ?? '') || null,
    base_salary,
    phone: String(formData.get('phone') ?? '') || null,
    email: String(formData.get('email') ?? '') || null
  }).select('id').single();

  if (error) throw new Error(`Impossible de créer la fiche personnel : ${error.message}`);

  // Historique jamais écrasé (règle métier §4.6) : première ligne dès la création.
  await supabase.from('personnel_salary_history').insert({
    school_id: school.id,
    personnel_id: personnel.id,
    base_salary,
    effective_from: new Date().toISOString().slice(0, 10)
  });

  redirect(`/dashboard/personnel/${personnel.id}`);
}
