import { createClient } from '@/lib/supabase/server';
import { submitExpense, approveExpense, rejectExpense, payExpense } from '../actions';

export default async function FicheDepensePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: expense } = await supabase
    .from('expenses')
    .select('*, suppliers(company_name)')
    .eq('id', params.id)
    .single();

  const { data: approvals } = await supabase
    .from('expense_approvals')
    .select('decision, comment, decided_at')
    .eq('expense_id', params.id)
    .order('decided_at', { ascending: false });

  const { data: cashSessions } = await supabase
    .from('cash_sessions').select('id, cash_registers(name)').eq('status', 'ouverte');
  const { data: bankAccounts } = await supabase
    .from('bank_accounts').select('id, account_name, bank_name');

  if (!expense) return <div className="page"><div className="error-box">Dépense introuvable.</div></div>;

  const steps = ['brouillon', 'soumise', 'validee', 'payee', 'comptabilisee'];
  const currentIndex = expense.status === 'rejetee' ? -1 : steps.indexOf(expense.status);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dépense {expense.expense_number}</h1>
          <div className="sub">{expense.category} — {(expense as any).suppliers?.company_name ?? expense.beneficiary_name ?? 'Bénéficiaire non enregistré'}</div>
        </div>
      </div>

      {expense.status === 'rejetee' && <div className="error-box">Cette dépense a été rejetée.</div>}

      <div className="grid-2">
        <div className="panel">
          <h2>Détails</h2>
          <table className="data">
            <tbody>
              <tr><td>Montant</td><td>{Number(expense.amount).toLocaleString('fr-FR')} FCFA</td></tr>
              <tr><td>Date</td><td>{expense.expense_date}</td></tr>
              <tr><td>Statut</td><td>{expense.status}</td></tr>
            </tbody>
          </table>

          {expense.status === 'brouillon' && (
            <form action={submitExpense} style={{ marginTop: 16 }}>
              <input type="hidden" name="expense_id" value={expense.id} />
              <button type="submit" className="btn primary">Soumettre pour validation</button>
            </form>
          )}

          {expense.status === 'soumise' && (
            <div className="approval-box" style={{ background: 'var(--accent-soft)', border: '1px solid #E7C892', padding: '16px 18px', marginTop: 20 }}>
              <h3 style={{ color: '#8A5A1E' }}>En attente de validation du Directeur</h3>
              <div className="hint" style={{ marginBottom: 12 }}>
                Toute dépense doit être validée par le Directeur avant paiement — aucune exception.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <form action={approveExpense}>
                  <input type="hidden" name="expense_id" value={expense.id} />
                  <button type="submit" className="btn primary">Valider</button>
                </form>
                <form action={rejectExpense}>
                  <input type="hidden" name="expense_id" value={expense.id} />
                  <button type="submit" className="btn ghost">Rejeter</button>
                </form>
              </div>
              <div className="hint" style={{ marginTop: 10 }}>
                Note : ce bouton n&apos;est bloqué par la RLS que si votre compte porte le rôle Directeur
                (policy <code>expense_approval_director_only</code>) — l&apos;affichage seul ne suffit pas à sécuriser l&apos;action.
              </div>
            </div>
          )}

          {expense.status === 'validee' && (
            <div className="panel" style={{ marginTop: 16, background: 'var(--bg)' }}>
              <h3>Payer cette dépense</h3>
              <form action={payExpense} className="form-grid">
                <input type="hidden" name="expense_id" value={expense.id} />
                <div className="f-item">
                  <label htmlFor="cash_session_id">Caisse (session ouverte)</label>
                  <select id="cash_session_id" name="cash_session_id" defaultValue="">
                    <option value="">—</option>
                    {cashSessions?.map((s: any) => <option key={s.id} value={s.id}>{s.cash_registers?.name}</option>)}
                  </select>
                </div>
                <div className="f-item">
                  <label htmlFor="bank_account_id">Ou compte bancaire</label>
                  <select id="bank_account_id" name="bank_account_id" defaultValue="">
                    <option value="">—</option>
                    {bankAccounts?.map((b) => <option key={b.id} value={b.id}>{b.bank_name} — {b.account_name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn primary">Payer</button>
              </form>
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Historique des décisions</h2>
          <table className="data">
            <thead><tr><th>Date</th><th>Décision</th><th>Commentaire</th></tr></thead>
            <tbody>
              {approvals?.map((a, i) => (
                <tr key={i}>
                  <td>{new Date(a.decided_at).toLocaleString('fr-FR')}</td>
                  <td>{a.decision === 'approved' ? 'Validée' : 'Rejetée'}</td>
                  <td>{a.comment ?? '—'}</td>
                </tr>
              ))}
              {!approvals?.length && <tr><td colSpan={3}>Aucune décision enregistrée.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
