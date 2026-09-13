import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv, csvResponse } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const accountId = request.nextUrl.searchParams.get('account_id');

  if (!accountId) {
    return new Response('Paramètre account_id requis.', { status: 400 });
  }

  const { data } = await supabase
    .from('accounting_entry_lines')
    .select('debit, credit, label, accounting_entries(entry_date, entry_number, description)')
    .eq('account_id', accountId);

  const sorted = (data ?? []).sort((a: any, b: any) =>
    new Date(a.accounting_entries?.entry_date).getTime() - new Date(b.accounting_entries?.entry_date).getTime()
  );

  let balance = 0;
  const rows = sorted.map((l: any) => {
    balance += Number(l.debit) - Number(l.credit);
    return {
      date: l.accounting_entries?.entry_date,
      piece: l.accounting_entries?.entry_number,
      libelle: l.label ?? l.accounting_entries?.description,
      debit: Number(l.debit) || '',
      credit: Number(l.credit) || '',
      solde: balance
    };
  });

  const csv = toCsv(rows, [
    { key: 'date', label: 'Date' },
    { key: 'piece', label: 'Pièce' },
    { key: 'libelle', label: 'Libellé' },
    { key: 'debit', label: 'Débit' },
    { key: 'credit', label: 'Crédit' },
    { key: 'solde', label: 'Solde' }
  ]);

  return csvResponse(csv, 'grand-livre.csv');
}
