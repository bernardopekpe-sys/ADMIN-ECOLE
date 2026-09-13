'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function updateSchool(formData: FormData) {
  const supabase = createClient();

  const id = String(formData.get('id'));

  const payload = {
    official_name: String(formData.get('official_name')),
    short_name: String(formData.get('short_name') ?? '') || null,
    code: String(formData.get('code')),
    school_type: String(formData.get('school_type') ?? '') || null,
    phone: String(formData.get('phone') ?? '') || null,
    email: String(formData.get('email') ?? '') || null,
    city: String(formData.get('city') ?? '') || null,
    address: String(formData.get('address') ?? '') || null,
    timezone: String(formData.get('timezone') ?? 'Africa/Libreville'),
    updated_at: new Date().toISOString()
  };

  // RLS (policy schools_update_own) exige has_permission('etablissement','modifier') :
  // un utilisateur sans ce droit reçoit une erreur ici, gérée plus bas.
  const { error } = await supabase.from('schools').update(payload).eq('id', id);

  if (error) {
    throw new Error(`Impossible d'enregistrer les paramètres de l'établissement : ${error.message}`);
  }

  revalidatePath('/dashboard/etablissement');
}
