'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createStudentLateness(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('student_lateness').insert({
    school_id: school.id,
    student_id: String(formData.get('student_id')),
    lateness_date: String(formData.get('lateness_date')),
    lateness_time: String(formData.get('lateness_time') ?? '') || null,
    reason: String(formData.get('reason') ?? '') || null,
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible d'enregistrer le retard : ${error.message}`);
  revalidatePath('/dashboard/vie-scolaire/retards');
}
