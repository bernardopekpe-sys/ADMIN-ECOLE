'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { amountToWordsFr } from '@/lib/num-to-words';

export async function createPayment(formData: FormData) {
  const supabase = createClient();

  const { data: school } = await supabase.from('schools').select('id, code').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const student_id = String(formData.get('student_id'));
  const guardian_id = String(formData.get('guardian_id') ?? '') || null;
  const payer_name = String(formData.get('payer_name') ?? '') || null;
  const payment_method = String(formData.get('payment_method'));
  const cash_session_id = String(formData.get('cash_session_id') ?? '') || null;

  const allocations: { installment_id: string; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('allocation_')) {
      const amount = Number(value);
      if (amount > 0) {
        allocations.push({ installment_id: key.replace('allocation_', ''), amount });
      }
    }
  }

  if (!allocations.length) {
    throw new Error('Aucun montant saisi sur les tranches à couvrir.');
  }

  const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);

  let cash_register_id: string | null = null;
  if (cash_session_id) {
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('cash_register_id')
      .eq('id', cash_session_id)
      .single();
    cash_register_id = session?.cash_register_id ?? null;
  }

  const year = new Date().getFullYear();
  const { data: paymentNumber, error: numError } = await supabase.rpc('get_next_number', {
    p_school_id: school.id, p_document_type: 'payment', p_year: year
  });
  if (numError) throw new Error(`Numérotation impossible : ${numError.message}`);

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      school_id: school.id,
      payment_number: paymentNumber,
      student_id,
      guardian_id,
      payer_name,
      amount: totalAmount,
      payment_method,
      cash_register_id,
      created_by: auth.user?.id
    })
    .select('id')
    .single();

  if (paymentError) {
    throw new Error(`Impossible d'enregistrer le paiement : ${paymentError.message}`);
  }

  const { error: allocError } = await supabase.from('payment_allocations').insert(
    allocations.map((a) => ({
      school_id: school.id,
      payment_id: payment.id,
      installment_id: a.installment_id,
      amount_allocated: a.amount
    }))
  );
  if (allocError) {
    throw new Error(`Paiement créé mais échec de la ventilation : ${allocError.message}`);
  }

  const { error: processError } = await supabase.rpc('process_student_payment', {
    p_payment_id: payment.id
  });
  if (processError) {
    throw new Error(`Paiement enregistré mais échec de la propagation comptable : ${processError.message}`);
  }

  await supabase
    .from('receipts')
    .update({ amount_in_words: amountToWordsFr(totalAmount) })
    .eq('payment_id', payment.id);

  redirect(`/dashboard/paiements/${payment.id}`);
}

// Annulation tracée — jamais de suppression. Réservée aux rôles avec le
// droit "paiements/annuler" (RLS + permission), typiquement le Directeur.
export async function cancelPayment(formData: FormData) {
  const supabase = createClient();
  const payment_id = String(formData.get('payment_id'));
  const reason = String(formData.get('reason'));

  if (!reason || reason.trim().length < 3) {
    throw new Error('Le motif d\'annulation est obligatoire.');
  }

  const { error } = await supabase.rpc('process_payment_cancellation', {
    p_payment_id: payment_id,
    p_reason: reason
  });

  if (error) throw new Error(`Impossible d'annuler ce paiement : ${error.message}`);

  revalidatePath(`/dashboard/paiements/${payment_id}`);
}
