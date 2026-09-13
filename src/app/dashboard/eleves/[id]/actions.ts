'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Soumet une demande de remise/exonération (fee_discounts, status=pending).
// L'application effective au montant dû reste soumise à validation (règle
// métier §4 — voir document d'architecture) : ce formulaire ne fait
// qu'enregistrer la demande, jamais l'appliquer directement.
export async function applyDiscount(formData: FormData) {
  const supabase = createClient();

  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const student_id = String(formData.get('student_id'));
  const student_fee_id = String(formData.get('student_fee_id'));
  const value = Number(formData.get('value'));
  const reason = String(formData.get('reason'));

  const { error } = await supabase.from('fee_discounts').insert({
    school_id: school.id,
    student_fee_id,
    discount_type: 'amount',
    value,
    reason,
    status: 'pending'
  });

  if (error) {
    throw new Error(`Impossible de soumettre la remise : ${error.message}`);
  }

  revalidatePath(`/dashboard/eleves/${student_id}`);
}

export async function uploadDocument(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const student_id = String(formData.get('student_id'));
  const document_type = String(formData.get('document_type'));
  const file = formData.get('file') as File;

  if (!file || file.size === 0) throw new Error('Aucun fichier sélectionné.');

  // Chemin school_id en tête : requis par les policies storage.objects
  // posées dans 0011_storage_documents.sql pour l'isolation multi-tenant.
  const path = `${school.id}/students/${student_id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, {
    contentType: file.type
  });
  if (uploadError) throw new Error(`Échec du téléversement : ${uploadError.message}`);

  const { error } = await supabase.from('documents').insert({
    school_id: school.id,
    owner_type: 'student',
    owner_id: student_id,
    document_type,
    storage_path: path,
    uploaded_by: auth.user?.id
  });

  if (error) throw new Error(`Fichier téléversé mais échec de l'enregistrement : ${error.message}`);
  revalidatePath(`/dashboard/eleves/${student_id}`);
}
