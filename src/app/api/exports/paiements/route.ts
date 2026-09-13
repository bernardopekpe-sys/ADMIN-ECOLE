import { createClient } from '@/lib/supabase/server';
import { toCsv, csvResponse } from '@/lib/csv';

export async function GET() {
  const supabase = createClient();

  // RLS s'applique normalement : cet export ne voit que l'établissement de
  // l'utilisateur connecté, comme n'importe quelle autre requête de l'app.
  const { data } = await supabase
    .from('payments')
    .select('payment_number, payment_date, amount, payment_method, status, students(last_name, first_names)')
    .order('payment_date', { ascending: false });

  const rows = (data ?? []).map((p: any) => ({
    numero: p.payment_number,
    date: p.payment_date,
    eleve: `${p.students?.last_name} ${p.students?.first_names}`,
    montant: p.amount,
    mode: p.payment_method,
    statut: p.status
  }));

  const csv = toCsv(rows, [
    { key: 'numero', label: 'N° paiement' },
    { key: 'date', label: 'Date' },
    { key: 'eleve', label: 'Élève' },
    { key: 'montant', label: 'Montant' },
    { key: 'mode', label: 'Mode' },
    { key: 'statut', label: 'Statut' }
  ]);

  return csvResponse(csv, 'paiements.csv');
}
