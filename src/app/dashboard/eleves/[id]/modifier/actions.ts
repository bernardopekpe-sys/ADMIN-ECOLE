'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updateStudent(formData: FormData) {
  const supabase = createClient();
  const student_id = String(formData.get('student_id'));

  const { error } = await supabase.from('students').update({
    registration_number: String(formData.get('registration_number')),
    gender: String(formData.get('gender')),
    last_name: String(formData.get('last_name')),
    first_names: String(formData.get('first_names')),
    birth_date: String(formData.get('birth_date') ?? '') || null,
    birth_place: String(formData.get('birth_place') ?? '') || null,
    nationality: String(formData.get('nationality') ?? '') || null,
    address: String(formData.get('address') ?? '') || null,
    status: String(formData.get('status')),
    updated_at: new Date().toISOString()
  }).eq('id', student_id);

  if (error) throw new Error(`Impossible de modifier la fiche : ${error.message}`);

  redirect(`/dashboard/eleves/${student_id}`);
}
