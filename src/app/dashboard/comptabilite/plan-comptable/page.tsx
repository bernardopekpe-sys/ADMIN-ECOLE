import { createClient } from '@/lib/supabase/server';
import { createAccount } from './actions';

export default async function PlanComptablePage() {
  const supabase = createClient();
  const { data: accounts } = await supabase
    .from('accounting_accounts')
    .select('id, account_number, label, account_class, is_active')
    .order('account_number');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Plan comptable</h1>
          <div className="sub">SYSCOHADA révisé — initialisé automatiquement, éditable ici</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Comptes</h2>
          <table className="data">
            <thead><tr><th>N°</th><th>Libellé</th><th>Classe</th></tr></thead>
            <tbody>
              {accounts?.map((a) => (
                <tr key={a.id}><td>{a.account_number}</td><td>{a.label}</td><td>{a.account_class}</td></tr>
              ))}
              {!accounts?.length && <tr><td colSpan={3}>Aucun compte — exécuter initialize_default_accounting() (voir ONBOARDING.md).</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Ajouter un compte</h2>
          <form action={createAccount} className="form-grid full">
            <div className="f-item"><label htmlFor="account_number">Numéro</label><input id="account_number" name="account_number" placeholder="622100" required /></div>
            <div className="f-item"><label htmlFor="label">Libellé</label><input id="label" name="label" required /></div>
            <div className="f-item">
              <label htmlFor="account_class">Classe SYSCOHADA</label>
              <select id="account_class" name="account_class" defaultValue="6">
                {[1,2,3,4,5,6,7,8,9].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" className="btn ghost">Ajouter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
