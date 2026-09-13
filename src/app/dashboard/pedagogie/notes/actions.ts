'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createEvaluation(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { data: evaluation, error } = await supabase.from('evaluations').insert({
    school_id: school.id,
    class_subject_id: String(formData.get('class_subject_id')),
    label: String(formData.get('label')),
    eval_date: String(formData.get('eval_date')),
    max_score: Number(formData.get('max_score') ?? 20)
  }).select('id').single();

  if (error) throw new Error(`Impossible de créer l'évaluation : ${error.message}`);
  redirect(`/dashboard/pedagogie/notes?evaluation_id=${evaluation.id}`);
}

export async function saveGrades(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const evaluation_id = String(formData.get('evaluation_id'));

  const rows: { school_id: string; evaluation_id: string; student_id: string; score: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('score_') && String(value).length > 0) {
      rows.push({ school_id: school.id, evaluation_id, student_id: key.replace('score_', ''), score: Number(value) });
    }
  }

  if (rows.length) {
    const { error } = await supabase.from('grades').upsert(rows, { onConflict: 'evaluation_id,student_id' });
    if (error) throw new Error(`Impossible d'enregistrer les notes : ${error.message}`);
  }

  redirect(`/dashboard/pedagogie/notes?evaluation_id=${evaluation_id}`);
}
