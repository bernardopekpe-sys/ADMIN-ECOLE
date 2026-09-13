'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createFeeType(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('fee_types').insert({
    school_id: school.id,
    name: String(formData.get('name')),
    is_mandatory: formData.get('is_mandatory') === 'true'
  });

  if (error) throw new Error(`Impossible de créer le type de frais : ${error.message}`);
  revalidatePath('/dashboard/frais');
}

export async function createFeeAssignment(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const academic_year_id = String(formData.get('academic_year_id'));
  if (!academic_year_id) throw new Error('Aucune année scolaire courante — créez-en une d\'abord.');

  const nullableId = (v: FormDataEntryValue | null) => (v && String(v).length > 0 ? String(v) : null);

  const { error } = await supabase.from('fee_assignments').insert({
    school_id: school.id,
    academic_year_id,
    fee_type_id: String(formData.get('fee_type_id')),
    amount: Number(formData.get('amount')),
    installment_periodicity: String(formData.get('installment_periodicity')),
    cycle_id: nullableId(formData.get('cycle_id')),
    level_id: nullableId(formData.get('level_id')),
    class_id: nullableId(formData.get('class_id'))
  });

  if (error) throw new Error(`Impossible d'ajouter ce barème : ${error.message}`);
  revalidatePath('/dashboard/frais');
}
