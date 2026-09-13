'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createEnrollment(formData: FormData) {
  const supabase = createClient();

  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const student_id = String(formData.get('student_id'));

  const payload = {
    school_id: school.id,
    student_id,
    academic_year_id: String(formData.get('academic_year_id')),
    class_id: String(formData.get('class_id')),
    enrollment_type: String(formData.get('enrollment_type')),
    is_new: formData.get('is_new') === 'true',
    is_repeater: formData.get('is_repeater') === 'true',
    status: 'inscrit' as const
  };

  // Le statut 'inscrit' directement à la création déclenche le trigger
  // trg_enrollments_generate_fees (0005_frais_a_inscription.sql) qui génère
  // automatiquement les student_fees applicables — pas de double saisie.
  const { error } = await supabase.from('enrollments').insert(payload);

  if (error) {
    throw new Error(`Impossible de créer l'inscription : ${error.message}`);
  }

  redirect(`/dashboard/eleves/${student_id}`);
}
