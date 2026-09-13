'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createBudgetLine(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const academic_year_id = String(formData.get('academic_year_id'));
  if (!academic_year_id) throw new Error('Aucune année scolaire courante — créez-en une d\'abord.');

  const { error } = await supabase.from('budgets').insert({
    school_id: school.id,
    academic_year_id,
    line_type: String(formData.get('line_type')),
    category: String(formData.get('category')),
    forecast_amount: Number(formData.get('forecast_amount'))
  });

  if (error) throw new Error(`Impossible d'ajouter la ligne budgétaire : ${error.message}`);
  revalidatePath('/dashboard/budget');
}
