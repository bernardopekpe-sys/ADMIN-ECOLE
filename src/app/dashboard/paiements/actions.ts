'use server';

import { redirect } from 'next/navigation';
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

  // Récupère l'allocation par tranche depuis les champs allocation_<installment_id>
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

  // 1. Résout la caisse ouverte correspondante (cash_session_id -> cash_register_id)
  let cash_register_id: string | null = null;
  if (cash_session_id) {
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('cash_register_id')
      .eq('id', cash_session_id)
      .single();
    cash_register_id = session?.cash_register_id ?? null;
  }

  // 2. Numérotation atomique + création du paiement
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

  // 3. Ventilation sur les tranches choisies
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

  // 4. Propagation complète : reçu -> caisse/banque -> comptabilité -> échéancier
  //    (process_student_payment, voir 02-rls-et-fonctions.sql §D.3)
  const { error: processError } = await supabase.rpc('process_student_payment', {
    p_payment_id: payment.id
  });
  if (processError) {
    throw new Error(`Paiement enregistré mais échec de la propagation comptable : ${processError.message}`);
  }

  // process_student_payment() a créé le reçu avec amount_in_words vide
  // (généré côté application, cf. commentaire dans 02-rls-et-fonctions.sql) —
  // on le complète ici.
  await supabase
    .from('receipts')
    .update({ amount_in_words: amountToWordsFr(totalAmount) })
    .eq('payment_id', payment.id);

  redirect(`/dashboard/paiements/${payment.id}`);
}
