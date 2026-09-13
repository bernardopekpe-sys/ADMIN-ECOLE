'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function openSession(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase.from('cash_sessions').insert({
    school_id: school.id,
    cash_register_id: String(formData.get('cash_register_id')),
    opened_by: auth.user?.id,
    opening_balance: Number(formData.get('opening_balance'))
  });

  if (error) throw new Error(`Impossible d'ouvrir la session de caisse : ${error.message}`);
  revalidatePath('/dashboard/caisse');
}

export async function closeSession(formData: FormData) {
  const supabase = createClient();

  const session_id = String(formData.get('session_id'));
  const physical_balance = Number(formData.get('physical_balance'));

  // close_cash_session() calcule le solde théorique et l'écart côté base
  // (voir 02-rls-et-fonctions.sql §D.4) — jamais recalculé côté client.
  const { error } = await supabase.rpc('close_cash_session', {
    p_session_id: session_id,
    p_physical_balance: physical_balance
  });

  if (error) throw new Error(`Impossible de clôturer la session : ${error.message}`);
  revalidatePath('/dashboard/caisse');
}

export async function createRegister(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { error } = await supabase.from('cash_registers').insert({
    school_id: school.id,
    name: String(formData.get('name'))
  });

  if (error) throw new Error(`Impossible de créer la caisse : ${error.message}`);
  revalidatePath('/dashboard/caisse');
}
