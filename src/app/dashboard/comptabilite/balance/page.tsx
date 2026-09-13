import { createClient } from '@/lib/supabase/server';

export default async function BalancePage() {
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
      return { ...a, ...t, soldeDebiteur: solde > 0 ? solde : 0, soldeCrediteur: solde < 0 ? -solde : 0 };
    })
    .filter((r) => r.debit > 0 || r.credit > 0);

  const grandTotalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const grandTotalCredit = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Balance</h1>
          <div className="sub">Cumul des mouvements par compte — total débit = total crédit si tout est équilibré</div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <a href="/api/exports/balance" className="btn ghost">Exporter en CSV (Excel)</a>
      </div>

      <div className="panel">
        <table className="data">
          <thead><tr><th>N°</th><th>Libellé</th><th className="num">Total débit</th><th className="num">Total crédit</th><th className="num">Solde débiteur</th><th className="num">Solde créditeur</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.account_number}</td>
                <td>{r.label}</td>
                <td className="num">{r.debit.toLocaleString('fr-FR')}</td>
                <td className="num">{r.credit.toLocaleString('fr-FR')}</td>
                <td className="num">{r.soldeDebiteur > 0 ? r.soldeDebiteur.toLocaleString('fr-FR') : ''}</td>
                <td className="num">{r.soldeCrediteur > 0 ? r.soldeCrediteur.toLocaleString('fr-FR') : ''}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6}>Aucun mouvement comptabilisé pour l&apos;instant.</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td colSpan={2}>Total</td>
                <td className="num">{grandTotalDebit.toLocaleString('fr-FR')}</td>
                <td className="num">{grandTotalCredit.toLocaleString('fr-FR')}</td>
                <td colSpan={2} className="num">{grandTotalDebit === grandTotalCredit ? 'Équilibrée ✓' : 'ÉCART !'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
