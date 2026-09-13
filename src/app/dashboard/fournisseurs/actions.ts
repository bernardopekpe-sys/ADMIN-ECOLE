'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createSupplier(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('suppliers').insert({
    school_id: school.id,
    company_name: String(formData.get('company_name')),
    contact_name: String(formData.get('contact_name') ?? '') || null,
    phone: String(formData.get('phone') ?? '') || null,
    address: String(formData.get('address') ?? '') || null,
    supplier_type: String(formData.get('supplier_type') ?? '') || null
  });

  if (error) throw new Error(`Impossible de créer le fournisseur : ${error.message}`);
  revalidatePath('/dashboard/fournisseurs');
}
