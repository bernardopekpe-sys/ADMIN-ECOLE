'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createSubject(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('subjects').insert({ school_id: school.id, name: String(formData.get('name')) });
  if (error) throw new Error(`Impossible de créer la matière : ${error.message}`);
  revalidatePath('/dashboard/pedagogie/matieres');
}

export async function assignSubjectToClass(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const personnel_id = String(formData.get('personnel_id') ?? '') || null;

  const { error } = await supabase.from('class_subjects').insert({
    school_id: school.id,
    class_id: String(formData.get('class_id')),
    subject_id: String(formData.get('subject_id')),
    personnel_id,
    coefficient: Number(formData.get('coefficient') ?? 1)
  });

  if (error) throw new Error(`Impossible d'affecter la matière : ${error.message}`);
  revalidatePath('/dashboard/pedagogie/matieres');
}
