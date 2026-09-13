import { createClient } from '@/lib/supabase/server';
import { createStudentAttendance, toggleJustified } from './actions';

export default async function AbsencesElevesPage() {
  const supabase = createClient();

  const { data: students } = await supabase.from('students').select('id, last_name, first_names, registration_number').order('last_name');
  const { data: classes } = await supabase.from('classes').select('id, name').order('name');
  const { data: absences } = await supabase
    .from('student_attendance')
    .select('id, absence_date, duration, reason, is_justified, students(last_name, first_names), classes(name)')
    .order('absence_date', { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Absences des élèves</h1>
          <div className="sub">Une absence non justifiée peut ensuite déclencher une proposition de retenue (personnel) — sans lien direct côté élève, qui ne relève pas de la paie</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Historique récent</h2>
          <table className="data">
            <thead><tr><th>Date</th><th>Élève</th><th>Classe</th><th>Motif</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {absences?.map((a: any) => (
                <tr key={a.id}>
                  <td>{a.absence_date}</td>
                  <td>{a.students?.last_name} {a.students?.first_names}</td>
                  <td>{a.classes?.name}</td>
                  <td>{a.reason ?? '—'}</td>
                  <td>{a.is_justified ? <span className="badge paid">Justifiée</span> : <span className="badge late">Non justifiée</span>}</td>
                  <td>
                    <form action={toggleJustified}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="is_justified" value={(!a.is_justified).toString()} />
                      <button type="submit" className="btn ghost">{a.is_justified ? 'Marquer non justifiée' : 'Marquer justifiée'}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!absences?.length && <tr><td colSpan={6}>Aucune absence enregistrée.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Déclarer une absence</h2>
          <form action={createStudentAttendance} className="form-grid full">
            <div className="f-item">
              <label htmlFor="student_id">Élève</label>
              <select id="student_id" name="student_id" required>
                {students?.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_names} ({s.registration_number})</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="class_id">Classe</label>
              <select id="class_id" name="class_id" required>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="absence_date">Date</label>
              <input id="absence_date" name="absence_date" type="date" required />
            </div>
            <div className="f-item">
              <label htmlFor="duration">Durée</label>
              <select id="duration" name="duration" defaultValue="journee">
                <option value="journee">Journée entière</option>
                <option value="demi-journee">Demi-journée</option>
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="reason">Motif</label>
              <input id="reason" name="reason" />
            </div>
            <button type="submit" className="btn primary">Enregistrer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
