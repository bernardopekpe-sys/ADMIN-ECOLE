import { createClient } from '@/lib/supabase/server';
import { createBankAccount, toggleReconciled } from './actions';

export default async function BanquesPage() {
  const supabase = createClient();

  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_name, account_number, opening_balance, status');

  const { data: transactions } = await supabase
    .from('bank_transactions')
    .select('id, transaction_type, amount, description, reconciled, created_at, bank_accounts(account_name)')
    .order('created_at', { ascending: false })
    .limit(40);

  const unreconciledCount = transactions?.filter((t) => !t.reconciled).length ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Banques</h1>
          <div className="sub">Comptes bancaires, mouvements et rapprochement</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Comptes</h2>
            <table className="data">
              <thead><tr><th>Banque</th><th>Compte</th><th>N°</th><th className="num">Solde initial</th></tr></thead>
              <tbody>
                {accounts?.map((a) => (
                  <tr key={a.id}>
                    <td>{a.bank_name}</td>
                    <td>{a.account_name}</td>
                    <td>{a.account_number}</td>
                    <td className="num">{Number(a.opening_balance).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
                {!accounts?.length && <tr><td colSpan={4}>Aucun compte bancaire créé.</td></tr>}
              </tbody>
            </table>
            <form action={createBankAccount} className="form-grid" style={{ marginTop: 14 }}>
              <div className="f-item"><label htmlFor="bank_name">Banque</label><input id="bank_name" name="bank_name" required /></div>
              <div className="f-item"><label htmlFor="account_name">Nom du compte</label><input id="account_name" name="account_name" required /></div>
              <div className="f-item"><label htmlFor="account_number">Numéro</label><input id="account_number" name="account_number" required /></div>
              <div className="f-item"><label htmlFor="opening_balance">Solde initial</label><input id="opening_balance" name="opening_balance" type="number" defaultValue={0} /></div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <h2>Mouvements — rapprochement</h2>
          <div className="hint" style={{ marginBottom: 10 }}>{unreconciledCount} mouvement(s) non rapproché(s)</div>
          <table className="data">
            <thead><tr><th>Date</th><th>Compte</th><th>Type</th><th className="num">Montant</th><th></th></tr></thead>
            <tbody>
              {transactions?.map((t: any) => (
                <tr key={t.id} style={{ opacity: t.reconciled ? 0.55 : 1 }}>
                  <td>{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{t.bank_accounts?.account_name}</td>
                  <td>{t.transaction_type}</td>
                  <td className="num">{Number(t.amount).toLocaleString('fr-FR')}</td>
                  <td>
                    <form action={toggleReconciled}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="reconciled" value={(!t.reconciled).toString()} />
                      <button type="submit" className="btn ghost">{t.reconciled ? 'Annuler' : 'Rapprocher'}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!transactions?.length && <tr><td colSpan={5}>Aucun mouvement.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
