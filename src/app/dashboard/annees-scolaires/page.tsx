import { createClient } from '@/lib/supabase/server';
import { createAcademicYear, setCurrentYear } from './actions';

export default async function AnneesScolairesPage() {
  const supabase = createClient();

  const { data: years } = await supabase
    .from('academic_years')
    .select('id, label, start_date, end_date, is_current, status, period_system')
    .order('start_date', { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Années scolaires</h1>
          <div className="sub">Chaque année choisit son système de périodes (trimestre ou palier)</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Historique</h2>
          <table className="data">
            <thead>
              <tr><th>Libellé</th><th>Période</th><th>Système</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {years?.map((y) => (
                <tr key={y.id}>
                  <td>{y.label} {y.is_current && <span className="badge paid">courante</span>}</td>
                  <td>{y.start_date} → {y.end_date}</td>
                  <td>{y.period_system === 'trimestre' ? 'Trimestres (1-3)' : 'Paliers (1-6)'}</td>
                  <td>{y.status === 'closed' ? <span className="badge late">Clôturée</span> : <span className="badge pending">Active</span>}</td>
                  <td>
                    {!y.is_current && y.status !== 'closed' && (
                      <form action={setCurrentYear}>
                        <input type="hidden" name="id" value={y.id} />
                        <button type="submit" className="btn ghost">Définir comme courante</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!years?.length && <tr><td colSpan={5}>Aucune année scolaire créée.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Créer une année scolaire</h2>
          <form action={createAcademicYear}>
            <div className="form-grid full">
              <div className="f-item">
                <label htmlFor="label">Libellé</label>
                <input id="label" name="label" placeholder="2027-2028" required />
              </div>
              <div className="f-item">
                <label htmlFor="start_date">Date de début</label>
                <input id="start_date" name="start_date" type="date" required />
              </div>
              <div className="f-item">
                <label htmlFor="end_date">Date de fin</label>
                <input id="end_date" name="end_date" type="date" required />
              </div>
              <div className="f-item">
                <label htmlFor="period_system">Système de périodes</label>
                <select id="period_system" name="period_system" defaultValue="trimestre">
                  <option value="trimestre">Trimestres (1 à 3)</option>
                  <option value="palier">Paliers (1 à 6)</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn primary" style={{ marginTop: 14 }}>Créer</button>
            <div className="hint">
              Les périodes d&apos;étude (study_periods) sont générées automatiquement,
              réparties uniformément entre les dates de début et de fin.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
