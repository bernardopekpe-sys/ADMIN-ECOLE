'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createExamination(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const academic_year_id = String(formData.get('academic_year_id'));
  if (!academic_year_id) throw new Error('Aucune année scolaire courante — créez-en une d\'abord.');

  const { error } = await supabase.from('examinations').insert({
    school_id: school.id, name: String(formData.get('name')), academic_year_id
  });

  if (error) throw new Error(`Impossible de créer l'examen : ${error.message}`);
  revalidatePath('/dashboard/examens');
}

export async function registerCandidate(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('examination_candidates').insert({
    school_id: school.id,
    examination_id: String(formData.get('examination_id')),
    student_id: String(formData.get('student_id'))
  });

  if (error) throw new Error(`Impossible d'inscrire le candidat : ${error.message}`);
  revalidatePath('/dashboard/examens');
}
