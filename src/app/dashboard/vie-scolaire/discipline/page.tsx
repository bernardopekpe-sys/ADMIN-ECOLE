import { createClient } from '@/lib/supabase/server';
import { createIncident, decideIncident } from './actions';

export default async function DisciplinePage() {
  const supabase = createClient();
  const { data: students } = await supabase.from('students').select('id, last_name, first_names').order('last_name');
  const { data: incidents } = await supabase
    .from('disciplinary_records')
    .select('id, incident_date, description, sanction, decision, guardian_summoned, students(last_name, first_names)')
    .order('incident_date', { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Discipline</h1><div className="sub">Incidents, sanctions et décisions</div></div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Incidents récents</h2>
          <table className="data">
            <thead><tr><th>Date</th><th>Élève</th><th>Description</th><th>Sanction</th><th>Décision</th></tr></thead>
            <tbody>
              {incidents?.map((i: any) => (
                <tr key={i.id}>
                  <td>{i.incident_date}</td>
                  <td>{i.students?.last_name} {i.students?.first_names}</td>
                  <td>{i.description}</td>
                  <td>{i.sanction ?? '—'}</td>
                  <td>
                    {i.decision ?? (
                      <form action={decideIncident} style={{ display: 'flex', gap: 6 }}>
                        <input type="hidden" name="id" value={i.id} />
                        <input name="decision" placeholder="Décision…" style={{ fontSize: 12, border: '1px solid var(--line)', padding: '4px 6px' }} />
                        <button type="submit" className="btn ghost">Valider</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!incidents?.length && <tr><td colSpan={5}>Aucun incident enregistré.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Déclarer un incident</h2>
          <form action={createIncident} className="form-grid full">
            <div className="f-item">
              <label htmlFor="student_id">Élève</label>
              <select id="student_id" name="student_id" required>
                {students?.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_names}</option>)}
              </select>
            </div>
            <div className="f-item"><label htmlFor="incident_date">Date</label><input id="incident_date" name="incident_date" type="date" required /></div>
            <div className="f-item"><label htmlFor="description">Description</label><textarea id="description" name="description" required /></div>
            <div className="f-item"><label htmlFor="sanction">Sanction proposée</label><input id="sanction" name="sanction" /></div>
            <div className="f-item">
              <label htmlFor="guardian_summoned">Responsable convoqué ?</label>
              <select id="guardian_summoned" name="guardian_summoned" defaultValue="false">
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            </div>
            <button type="submit" className="btn primary">Enregistrer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
