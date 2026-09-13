'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function getSchoolId(supabase: ReturnType<typeof createClient>) {
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  return school.id;
}

export async function createCategory(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);

  const { error } = await supabase.from('stock_categories').insert({ school_id, name: String(formData.get('name')) });
  if (error) throw new Error(`Impossible de créer la catégorie : ${error.message}`);
  revalidatePath('/dashboard/stock');
}

export async function createItem(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);

  const { error } = await supabase.from('stock_items').insert({
    school_id,
    category_id: String(formData.get('category_id') ?? '') || null,
    name: String(formData.get('name')),
    unit: String(formData.get('unit') ?? 'unité'),
    min_quantity: Number(formData.get('min_quantity') ?? 0)
  });

  if (error) throw new Error(`Impossible de créer l'article : ${error.message}`);
  revalidatePath('/dashboard/stock');
}

export async function recordMovement(formData: FormData) {
  const supabase = createClient();
  const school_id = await getSchoolId(supabase);
  const { data: auth } = await supabase.auth.getUser();

  // current_quantity est mise à jour automatiquement par le trigger
  // apply_stock_movement() (0008_v5_pedagogie_stock_cantine.sql) — jamais
  // recalculée côté application.
  const { error } = await supabase.from('stock_movements').insert({
    school_id,
    item_id: String(formData.get('item_id')),
    movement_type: String(formData.get('movement_type')),
    quantity: Number(formData.get('quantity')),
    reason: String(formData.get('reason') ?? '') || null,
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible d'enregistrer le mouvement : ${error.message}`);
  revalidatePath('/dashboard/stock');
}
