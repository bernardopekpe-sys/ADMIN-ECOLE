import { createClient } from '@/lib/supabase/server';
import { openSession, closeSession, createRegister } from './actions';

export default async function CaissePage() {
  const supabase = createClient();

  const { data: registers } = await supabase.from('cash_registers').select('id, name');

  const { data: sessions } = await supabase
    .from('cash_sessions')
    .select('id, opening_balance, status, opened_at, closed_at, theoretical_balance, physical_balance, variance, cash_registers(name)')
    .order('opened_at', { ascending: false })
    .limit(20);

  const openSessions = sessions?.filter((s) => s.status === 'ouverte') ?? [];
  const registersWithoutOpenSession = registers?.filter(
    (r) => !openSessions.some((s: any) => s.cash_registers?.name === r.name)
  ) ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Caisse</h1>
          <div className="sub">Ouverture, mouvements et clôture</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Sessions récentes</h2>
          <table className="data">
            <thead><tr><th>Caisse</th><th>Ouverte le</th><th>Statut</th><th className="num">Théorique</th><th className="num">Physique</th><th className="num">Écart</th><th></th></tr></thead>
            <tbody>
              {sessions?.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.cash_registers?.name}</td>
                  <td>{new Date(s.opened_at).toLocaleString('fr-FR')}</td>
                  <td>{s.status === 'ouverte' ? <span className="badge pending">Ouverte</span> : <span className="badge paid">Clôturée</span>}</td>
                  <td className="num">{s.theoretical_balance != null ? Number(s.theoretical_balance).toLocaleString('fr-FR') : '—'}</td>
                  <td className="num">{s.physical_balance != null ? Number(s.physical_balance).toLocaleString('fr-FR') : '—'}</td>
                  <td className="num">{s.variance != null ? Number(s.variance).toLocaleString('fr-FR') : '—'}</td>
                  <td>
                    {s.status === 'ouverte' && (
                      <form action={closeSession}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input name="physical_balance" type="number" placeholder="Solde compté" required
                          style={{ width: 100, border: '1px solid var(--line)', padding: '4px 6px', marginRight: 6 }} />
                        <button type="submit" className="btn ghost">Clôturer</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!sessions?.length && <tr><td colSpan={7}>Aucune session de caisse.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Ouvrir une session</h2>
          {!registersWithoutOpenSession.length && registers?.length ? (
            <div className="hint">Toutes les caisses ont déjà une session ouverte.</div>
          ) : (
            <form action={openSession} className="form-grid full">
              <div className="f-item">
                <label htmlFor="cash_register_id">Caisse</label>
                <select id="cash_register_id" name="cash_register_id" required>
                  {registersWithoutOpenSession.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="f-item">
                <label htmlFor="opening_balance">Fonds initial (FCFA)</label>
                <input id="opening_balance" name="opening_balance" type="number" min="0" defaultValue={0} required />
              </div>
              <button type="submit" className="btn primary">Ouvrir</button>
            </form>
          )}
          {!registers?.length && (
            <div className="hint">Aucune caisse paramétrée — créez-en une ci-dessous.</div>
          )}

          <h3>Créer une nouvelle caisse</h3>
          <form action={createRegister} className="form-grid full">
            <div className="f-item">
              <label htmlFor="register_name">Nom</label>
              <input id="register_name" name="name" placeholder="Caisse principale, caisse administrative..." required />
            </div>
            <button type="submit" className="btn ghost">Créer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
