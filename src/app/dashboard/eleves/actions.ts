'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createStudent(formData: FormData) {
  const supabase = createClient();

  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const payload = {
    school_id: school.id,
    registration_number: String(formData.get('registration_number')),
    gender: String(formData.get('gender')),
    last_name: String(formData.get('last_name')),
    first_names: String(formData.get('first_names')),
    birth_date: String(formData.get('birth_date') ?? '') || null,
    birth_place: String(formData.get('birth_place') ?? '') || null,
    nationality: String(formData.get('nationality') ?? '') || null,
    address: String(formData.get('address') ?? '') || null
  };

  const { data: student, error } = await supabase.from('students').insert(payload).select('id').single();

  if (error) {
    throw new Error(`Impossible de créer l'élève : ${error.message}`);
  }

  revalidatePath('/dashboard/eleves');
  redirect(`/dashboard/eleves/${student.id}`);
}
