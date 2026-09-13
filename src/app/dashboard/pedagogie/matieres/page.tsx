import { createClient } from '@/lib/supabase/server';
import { createSubject, assignSubjectToClass } from './actions';

export default async function MatieresPage() {
  const supabase = createClient();
  const [{ data: subjects }, { data: classes }, { data: personnel }, { data: assignments }] = await Promise.all([
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('classes').select('id, name').order('name'),
    supabase.from('personnel').select('id, last_name, first_names').eq('status', 'active').order('last_name'),
    supabase.from('class_subjects').select('id, coefficient, classes(name), subjects(name), personnel(last_name, first_names)')
  ]);

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Matières</h1><div className="sub">Matières et affectation aux classes/enseignants</div></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Matières</h2>
            <table className="data">
              <tbody>
                {subjects?.map((s) => <tr key={s.id}><td>{s.name}</td></tr>)}
                {!subjects?.length && <tr><td>Aucune matière créée.</td></tr>}
              </tbody>
            </table>
            <form action={createSubject} className="form-grid" style={{ marginTop: 12 }}>
              <div className="f-item"><label htmlFor="name">Nouvelle matière</label><input id="name" name="name" placeholder="Mathématiques..." required /></div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <h2>Affectations</h2>
          <table className="data">
            <thead><tr><th>Classe</th><th>Matière</th><th>Enseignant</th><th className="num">Coeff.</th></tr></thead>
            <tbody>
              {assignments?.map((a: any) => (
                <tr key={a.id}>
                  <td>{a.classes?.name}</td><td>{a.subjects?.name}</td>
                  <td>{a.personnel ? `${a.personnel.last_name} ${a.personnel.first_names}` : '—'}</td>
                  <td className="num">{a.coefficient}</td>
                </tr>
              ))}
              {!assignments?.length && <tr><td colSpan={4}>Aucune affectation.</td></tr>}
            </tbody>
          </table>
          <form action={assignSubjectToClass} className="form-grid" style={{ marginTop: 12 }}>
            <div className="f-item"><label htmlFor="class_id">Classe</label>
              <select id="class_id" name="class_id" required>{classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="f-item"><label htmlFor="subject_id">Matière</label>
              <select id="subject_id" name="subject_id" required>{subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>
            <div className="f-item"><label htmlFor="personnel_id">Enseignant</label>
              <select id="personnel_id" name="personnel_id" defaultValue="">
                <option value="">—</option>
                {personnel?.map((p) => <option key={p.id} value={p.id}>{p.last_name} {p.first_names}</option>)}
              </select>
            </div>
            <div className="f-item"><label htmlFor="coefficient">Coefficient</label><input id="coefficient" name="coefficient" type="number" step="0.5" defaultValue={1} /></div>
            <button type="submit" className="btn ghost">Affecter</button>
          </form>
        </div>
      </div>
    </div>
  );
}
