import { createClient } from '@/lib/supabase/server';

export default async function GrandLivrePage({ searchParams }: { searchParams: { account_id?: string } }) {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from('accounting_accounts')
    .select('id, account_number, label')
    .order('account_number');

  let lines: any[] = [];
  let runningBalance = 0;

  if (searchParams?.account_id) {
    const { data } = await supabase
      .from('accounting_entry_lines')
      .select('id, debit, credit, label, accounting_entries(entry_date, entry_number, description)')
      .eq('account_id', searchParams.account_id)
      .order('id');
    lines = (data ?? []).sort((a: any, b: any) =>
      new Date(a.accounting_entries?.entry_date).getTime() - new Date(b.accounting_entries?.entry_date).getTime()
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Grand livre</h1>
          <div className="sub">Mouvements et solde par compte</div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 360, marginBottom: 16 }}>
        <form>
          <div className="f-item">
            <label htmlFor="account_id">Compte</label>
            <select id="account_id" name="account_id" defaultValue={searchParams?.account_id ?? ''}>
              <option value="" disabled>Sélectionner…</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.account_number} — {a.label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn ghost" style={{ marginTop: 10 }}>Afficher</button>
        </form>
      </div>

      {searchParams?.account_id && (
        <div style={{ marginBottom: 12 }}>
          <a href={`/api/exports/grand-livre?account_id=${searchParams.account_id}`} className="btn ghost">Exporter en CSV (Excel)</a>
        </div>
      )}

      {searchParams?.account_id && (
        <div className="panel">
          <table className="data">
            <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th className="num">Débit</th><th className="num">Crédit</th><th className="num">Solde</th></tr></thead>
            <tbody>
              {lines.map((l: any) => {
                runningBalance += Number(l.debit) - Number(l.credit);
                return (
                  <tr key={l.id}>
                    <td>{l.accounting_entries?.entry_date}</td>
                    <td>{l.accounting_entries?.entry_number}</td>
                    <td>{l.label ?? l.accounting_entries?.description}</td>
                    <td className="num">{Number(l.debit) > 0 ? Number(l.debit).toLocaleString('fr-FR') : ''}</td>
                    <td className="num">{Number(l.credit) > 0 ? Number(l.credit).toLocaleString('fr-FR') : ''}</td>
                    <td className="num">{runningBalance.toLocaleString('fr-FR')}</td>
                  </tr>
                );
              })}
              {!lines.length && <tr><td colSpan={6}>Aucun mouvement sur ce compte.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
