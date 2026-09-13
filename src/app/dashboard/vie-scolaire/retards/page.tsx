import { createClient } from '@/lib/supabase/server';
import { createStudentLateness } from './actions';

export default async function RetardsElevesPage() {
  const supabase = createClient();
  const { data: students } = await supabase.from('students').select('id, last_name, first_names').order('last_name');
  const { data: retards } = await supabase
    .from('student_lateness')
    .select('id, lateness_date, lateness_time, reason, students(last_name, first_names)')
    .order('lateness_date', { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Retards des élèves</h1><div className="sub">Suivi des retards</div></div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Historique récent</h2>
          <table className="data">
            <thead><tr><th>Date</th><th>Heure</th><th>Élève</th><th>Motif</th></tr></thead>
            <tbody>
              {retards?.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.lateness_date}</td><td>{r.lateness_time ?? '—'}</td>
                  <td>{r.students?.last_name} {r.students?.first_names}</td><td>{r.reason ?? '—'}</td>
                </tr>
              ))}
              {!retards?.length && <tr><td colSpan={4}>Aucun retard enregistré.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <h2>Déclarer un retard</h2>
          <form action={createStudentLateness} className="form-grid full">
            <div className="f-item">
              <label htmlFor="student_id">Élève</label>
              <select id="student_id" name="student_id" required>
                {students?.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_names}</option>)}
              </select>
            </div>
            <div className="f-item"><label htmlFor="lateness_date">Date</label><input id="lateness_date" name="lateness_date" type="date" required /></div>
            <div className="f-item"><label htmlFor="lateness_time">Heure</label><input id="lateness_time" name="lateness_time" type="time" /></div>
            <div className="f-item"><label htmlFor="reason">Motif</label><input id="reason" name="reason" /></div>
            <button type="submit" className="btn primary">Enregistrer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
