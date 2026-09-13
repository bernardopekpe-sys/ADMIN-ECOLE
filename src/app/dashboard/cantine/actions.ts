'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createSubscription(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const academic_year_id = String(formData.get('academic_year_id'));
  if (!academic_year_id) throw new Error('Aucune année scolaire courante — créez-en une d\'abord.');

  const { error } = await supabase.from('cantine_subscriptions').insert({
    school_id: school.id,
    student_id: String(formData.get('student_id')),
    academic_year_id
  });

  if (error) throw new Error(`Impossible d'abonner l'élève : ${error.message}`);
  revalidatePath('/dashboard/cantine');
}

export async function recordAttendance(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('cantine_attendance').insert({
    school_id: school.id,
    student_id: String(formData.get('student_id')),
    attendance_date: new Date().toISOString().slice(0, 10),
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible d'enregistrer la présence : ${error.message}`);
  revalidatePath('/dashboard/cantine');
}
