import { createClient } from '@/lib/supabase/server';
import { createUserAccount, createAdvance, createLoan, createBonus, resetPin } from './actions';

export default async function FichePersonnelPage({
  params, searchParams
}: {
  params: { id: string };
  searchParams: { code?: string; pin?: string; diag?: string; reset?: string };
}) {
  try {
    const supabase = createClient();

    const personResult = await supabase.from('personnel').select('*').eq('id', params.id).single();
    if (personResult.error) throw new Error(`Requête personnel : ${personResult.error.message}`);
    const person = personResult.data;

    const userProfileResult = await supabase.from('user_profiles').select('id, full_name, login_code').eq('personnel_id', params.id).maybeSingle();
    if (userProfileResult.error) throw new Error(`Requête user_profiles : ${userProfileResult.error.message}`);
    const userProfile = userProfileResult.data;

    const salaryHistoryResult = await supabase.from('personnel_salary_history').select('base_salary, effective_from, effective_to').eq('personnel_id', params.id).order('effective_from', { ascending: false });
    if (salaryHistoryResult.error) throw new Error(`Requête salary_history : ${salaryHistoryResult.error.message}`);
    const salaryHistory = salaryHistoryResult.data;

    const advancesResult = await supabase.from('advances').select('id, amount, reason, status, advance_date').eq('personnel_id', params.id).order('advance_date', { ascending: false });
    if (advancesResult.error) throw new Error(`Requête advances : ${advancesResult.error.message}`);
    const advances = advancesResult.data;

    const loansResult = await supabase.from('personnel_loans').select('id, principal_amount, monthly_installment, status, loan_date').eq('personnel_id', params.id).order('loan_date', { ascending: false });
    if (loansResult.error) throw new Error(`Requête loans : ${loansResult.error.message}`);
    const loans = loansResult.data;

    const rolesResult = await supabase.from('roles').select('id, name').order('name');
    if (rolesResult.error) throw new Error(`Requête roles : ${rolesResult.error.message}`);
    const roles = rolesResult.data;

    if (!person) return <div className="page"><div className="error-box">Fiche personnel introuvable.</div></div>;

    return (
      <div className="page">
             <div className="page-head">
        <div>
          <h1>{person.last_name} {person.first_names}</h1>
          <div className="sub">{person.role_function} — Matricule {person.registration_number}</div>
        </div>
        <a href={`/dashboard/personnel/${person.id}/modifier`} className="btn ghost">Modifier / Désactiver</a>
      </div>

        <div className="grid-2">
          <div className="panel">
            <h2>Fiche</h2>
            <table className="data">
              <tbody>
                <tr><td>Salaire de base actuel</td><td>{Number(person.base_salary).toLocaleString('fr-FR')} FCFA</td></tr>
                <tr><td>Date d&apos;embauche</td><td>{person.hire_date ?? '—'}</td></tr>
                <tr><td>Type de contrat</td><td>{person.contract_type ?? '—'}</td></tr>
                <tr><td>Téléphone</td><td>{person.phone ?? '—'}</td></tr>
              </tbody>
            </table>

            <h3>Historique des salaires</h3>
            <table className="data">
              <thead><tr><th>Depuis</th><th>Jusqu&apos;à</th><th className="num">Montant</th></tr></thead>
              <tbody>
                {salaryHistory?.map((s, i) => (
                  <tr key={i}><td>{s.effective_from}</td><td>{s.effective_to ?? 'en cours'}</td><td className="num">{Number(s.base_salary).toLocaleString('fr-FR')}</td></tr>
                ))}
              </tbody>
            </table>

            <h3>Compte utilisateur</h3>

            {searchParams?.diag && (
              <div className="error-box">DIAGNOSTIC — {searchParams.diag}</div>
            )}

            {searchParams?.pin ? (
              <div style={{ background: 'var(--accent-soft)', border: '1px solid #E7C892', padding: '12px 14px' }}>
                <strong>Note ces identifiants — affichés une seule fois :</strong>
                <div>Code : {searchParams.code}</div>
                <div>PIN : {searchParams.pin}</div>
              </div>
            ) : userProfile ? (
              <div>
                <div className="hint" style={{ marginBottom: 10 }}>
                  Compte actif : {userProfile.full_name} — Code : {userProfile.login_code ?? '—'}
                </div>
                <form action={resetPin}>
                  <input type="hidden" name="personnel_id" value={person.id} />
                  <button type="submit" className="btn ghost">Réinitialiser le PIN</button>
                </form>
              </div>
            ) : (
              <form action={createUserAccount} className="form-grid">
                <input type="hidden" name="personnel_id" value={person.id} />
                <div className="f-item">
                  <label htmlFor="login_code">Code court (ex: SEC-01)</label>
                  <input id="login_code" name="login_code" placeholder="SEC-01" required />
                </div>
                <div className="f-item"><label htmlFor="role_id">Rôle</label>
                  <select id="role_id" name="role_id" required>
                    {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn ghost">Créer le compte</button>
              </form>
            )}
          </div>

          <div>
            <div className="panel">
              <h2>Avances</h2>
              <table className="data">
                <tbody>
                  {advances?.map((a) => <tr key={a.id}><td>{a.advance_date}</td><td className="num">{Number(a.amount).toLocaleString('fr-FR')}</td><td>{a.status}</td></tr>)}
                  {!advances?.length && <tr><td colSpan={3}>Aucune avance.</td></tr>}
                </tbody>
              </table>
              <form action={createAdvance} className="form-grid" style={{ marginTop: 10 }}>
                <input type="hidden" name="personnel_id" value={person.id} />
                <div className="f-item"><label htmlFor="amount">Montant</label><input id="amount" name="amount" type="number" min="1" required /></div>
                <div className="f-item"><label htmlFor="reason">Motif</label><input id="reason" name="reason" /></div>
                <button type="submit" className="btn ghost">Soumettre</button>
              </form>
            </div>

            <div className="panel">
              <h2>Prêts</h2>
              <table className="data">
                <tbody>
                  {loans?.map((l) => <tr key={l.id}><td>{l.loan_date}</td><td className="num">{Number(l.principal_amount).toLocaleString('fr-FR')}</td><td className="num">{Number(l.monthly_installment).toLocaleString('fr-FR')}/mois</td><td>{l.status}</td></tr>)}
                  {!loans?.length && <tr><td colSpan={4}>Aucun prêt.</td></tr>}
                </tbody>
              </table>
              <form action={createLoan} className="form-grid" style={{ marginTop: 10 }}>
                <input type="hidden" name="personnel_id" value={person.id} />
                <div className="f-item"><label htmlFor="principal_amount">Montant</label><input id="principal_amount" name="principal_amount" type="number" min="1" required /></div>
                <div className="f-item"><label htmlFor="installment_count">Échéances</label><input id="installment_count" name="installment_count" type="number" min="1" required /></div>
                <div className="f-item"><label htmlFor="monthly_installment">Mensualité</label><input id="monthly_installment" name="monthly_installment" type="number" min="1" required /></div>
                <div className="f-item"><label htmlFor="start_date">Début</label><input id="start_date" name="start_date" type="date" required /></div>
                <button type="submit" className="btn ghost">Créer</button>
              </form>
            </div>

            <div className="panel">
              <h2>Primes / bonus</h2>
              <form action={createBonus} className="form-grid">
                <input type="hidden" name="personnel_id" value={person.id} />
                <div className="f-item"><label htmlFor="label">Libellé</label><input id="label" name="label" placeholder="Prime de rendement..." required /></div>
                <div className="f-item"><label htmlFor="bonus_amount">Montant</label><input id="bonus_amount" name="bonus_amount" type="number" min="1" required /></div>
                <div className="f-item"><label htmlFor="period">Mois concerné</label><input id="period" name="period" type="date" required /></div>
                <button type="submit" className="btn ghost">Soumettre pour validation</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="page">
        <div className="error-box">DIAGNOSTIC PAGE — {e?.message ?? String(e)}</div>
      </div>
    );
  }
}
