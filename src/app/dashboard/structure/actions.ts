'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function getSchoolId(supabase: ReturnType<typeof createClient>) {
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  return school.id;
}

export async function createCycle(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);
  const name = String(formData.get('name'));

  const { error } = await supabase.from('cycles').insert({ school_id, name });
  if (error) throw new Error(`Impossible de créer le cycle : ${error.message}`);

  revalidatePath('/dashboard/structure');
}

export async function createLevel(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);
  const name = String(formData.get('name'));
  const cycle_id = String(formData.get('cycle_id'));

  const { error } = await supabase.from('levels').insert({ school_id, name, cycle_id });
  if (error) throw new Error(`Impossible de créer le niveau : ${error.message}`);

  revalidatePath('/dashboard/structure');
}

export async function createClass(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);
  const name = String(formData.get('name'));
  const level_id = String(formData.get('level_id'));
  const academic_year_id = String(formData.get('academic_year_id'));
  const capacityRaw = formData.get('capacity');
  const capacity = capacityRaw ? Number(capacityRaw) : null;

  if (!academic_year_id) {
    throw new Error('Aucune année scolaire courante — créez-en une avant d\'ajouter une classe.');
  }

  // classes.cycle_id est non-nullable : dérivé automatiquement du niveau choisi
  // pour éviter de redemander une information déjà portée par le niveau.
  const { data: level, error: levelError } = await supabase
    .from('levels')
    .select('cycle_id')
    .eq('id', level_id)
    .single();

  if (levelError || !level) {
    throw new Error('Niveau introuvable.');
  }

  const { error } = await supabase.from('classes').insert({
    school_id, name, level_id, academic_year_id, capacity, cycle_id: level.cycle_id
  });

  if (error) throw new Error(`Impossible de créer la classe : ${error.message}`);

  revalidatePath('/dashboard/structure');
}
