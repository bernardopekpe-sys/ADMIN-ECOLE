'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createStudentAttendance(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('student_attendance').insert({
    school_id: school.id,
    student_id: String(formData.get('student_id')),
    class_id: String(formData.get('class_id')),
    absence_date: String(formData.get('absence_date')),
    duration: String(formData.get('duration') ?? '') || null,
    reason: String(formData.get('reason') ?? '') || null,
    is_justified: false,
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible d'enregistrer l'absence : ${error.message}`);
  revalidatePath('/dashboard/vie-scolaire/absences');
}

export async function toggleJustified(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const is_justified = formData.get('is_justified') === 'true';

  const { error } = await supabase.from('student_attendance').update({ is_justified }).eq('id', id);
  if (error) throw new Error(`Impossible de mettre à jour : ${error.message}`);
  revalidatePath('/dashboard/vie-scolaire/absences');
}
