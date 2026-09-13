'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createIncident(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('disciplinary_records').insert({
    school_id: school.id,
    student_id: String(formData.get('student_id')),
    incident_date: String(formData.get('incident_date')),
    description: String(formData.get('description')),
    sanction: String(formData.get('sanction') ?? '') || null,
    guardian_summoned: formData.get('guardian_summoned') === 'true',
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible d'enregistrer l'incident : ${error.message}`);
  revalidatePath('/dashboard/vie-scolaire/discipline');
}

export async function decideIncident(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));
  const decision = String(formData.get('decision'));

  // La validation d'une décision disciplinaire est réservée au Directeur
  // dans la matrice de permissions par défaut (voir 05-matrice-permissions.md)
  // — appliquée ici via has_permission côté RLS sur disciplinary_records,
  // à ajouter explicitement si ce n'est pas déjà couvert par la policy
  // générique tenant_isolation_update (voir TODO sécurité dans le README).
  const { error } = await supabase.from('disciplinary_records').update({ decision }).eq('id', id);
  if (error) throw new Error(`Impossible d'enregistrer la décision : ${error.message}`);
  revalidatePath('/dashboard/vie-scolaire/discipline');
}
