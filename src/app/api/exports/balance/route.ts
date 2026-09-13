import { createClient } from '@/lib/supabase/server';
import { toCsv, csvResponse } from '@/lib/csv';

export async function GET() {
  const supabase = createClient();

  const { data: accounts } = await supabase.from('accounting_accounts').select('id, account_number, label');
  const { data: lines } = await supabase.from('accounting_entry_lines').select('account_id, debit, credit');

  const totals = new Map<string, { debit: number; credit: number }>();
  for (const l of lines ?? []) {
    const t = totals.get(l.account_id) ?? { debit: 0, credit: 0 };
    t.debit += Number(l.debit);
    t.credit += Number(l.credit);
    totals.set(l.account_id, t);
  }

  const rows = (accounts ?? [])
    .map((a) => {
      const t = totals.get(a.id) ?? { debit: 0, credit: 0 };
      const solde = t.debit - t.credit;
      return {
        numero: a.account_number,
        libelle: a.label,
        debit: t.debit,
        credit: t.credit,
        soldeDebiteur: solde > 0 ? solde : '',
        soldeCrediteur: solde < 0 ? -solde : ''
      };
    })
    .filter((r) => r.debit > 0 || r.credit > 0);

  const csv = toCsv(rows, [
    { key: 'numero', label: 'N° compte' },
    { key: 'libelle', label: 'Libellé' },
    { key: 'debit', label: 'Total débit' },
    { key: 'credit', label: 'Total crédit' },
    { key: 'soldeDebiteur', label: 'Solde débiteur' },
    { key: 'soldeCrediteur', label: 'Solde créditeur' }
  ]);

  return csvResponse(csv, 'balance.csv');
}
