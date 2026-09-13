import { createClient } from '@/lib/supabase/server';
import { toCsv, csvResponse } from '@/lib/csv';

export async function GET() {
  const supabase = createClient();

  const { data } = await supabase
    .from('expenses')
    .select('expense_number, expense_date, category, amount, status, suppliers(company_name)')
    .order('expense_date', { ascending: false });

  const rows = (data ?? []).map((e: any) => ({
    numero: e.expense_number,
    date: e.expense_date,
    fournisseur: e.suppliers?.company_name ?? '',
    categorie: e.category,
    montant: e.amount,
    statut: e.status
  }));

  const csv = toCsv(rows, [
    { key: 'numero', label: 'N° dépense' },
    { key: 'date', label: 'Date' },
    { key: 'fournisseur', label: 'Fournisseur' },
    { key: 'categorie', label: 'Catégorie' },
    { key: 'montant', label: 'Montant' },
    { key: 'statut', label: 'Statut' }
  ]);

  return csvResponse(csv, 'depenses.csv');
}
