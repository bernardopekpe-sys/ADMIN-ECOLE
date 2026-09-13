import { createClient } from '@/lib/supabase/server';
import { createExamination, registerCandidate } from './actions';

export default async function ExamensPage({ searchParams }: { searchParams: { examen_id?: string } }) {
  const supabase = createClient();
  const { data: years } = await supabase.from('academic_years').select('id, label, is_current').order('start_date', { ascending: false });
  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  const { data: examinations } = await supabase.from('examinations').select('id, name').order('name');
  const { data: students } = await supabase.from('students').select('id, last_name, first_names').order('last_name');

  let candidates: any[] = [];
  if (searchParams?.examen_id) {
    const { data } = await supabase
      .from('examination_candidates')
      .select('id, status, missing_documents, students(last_name, first_names)')
      .eq('examination_id', searchParams.examen_id);
    candidates = data ?? [];
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Examens</h1><div className="sub">CEP, BEPC, BAC, examens internes...</div></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Examens</h2>
            <table className="data">
              <tbody>
                {examinations?.map((e) => (
                  <tr key={e.id}><td>{e.name}</td><td><a href={`/dashboard/examens?examen_id=${e.id}`}>Candidats →</a></td></tr>
                ))}
                {!examinations?.length && <tr><td>Aucun examen créé.</td></tr>}
              </tbody>
            </table>
            <form action={createExamination} className="form-grid" style={{ marginTop: 12 }}>
              <input type="hidden" name="academic_year_id" value={currentYear?.id ?? ''} />
              <div className="f-item"><label htmlFor="name">Nouvel examen</label><input id="name" name="name" placeholder="BEPC, BAC série D..." required /></div>
              <button type="submit" className="btn ghost">Créer</button>
            </form>
          </div>
        </div>

        {searchParams?.examen_id && (
          <div className="panel">
            <h2>Candidats</h2>
            <table className="data">
              <thead><tr><th>Élève</th><th>Statut</th><th>Pièces manquantes</th></tr></thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>{c.students?.last_name} {c.students?.first_names}</td>
                    <td>{c.status}</td>
                    <td>{c.missing_documents ?? '—'}</td>
                  </tr>
                ))}
                {!candidates.length && <tr><td colSpan={3}>Aucun candidat inscrit.</td></tr>}
              </tbody>
            </table>
            <form action={registerCandidate} className="form-grid" style={{ marginTop: 12 }}>
              <input type="hidden" name="examination_id" value={searchParams.examen_id} />
              <div className="f-item">
                <label htmlFor="student_id">Élève</label>
                <select id="student_id" name="student_id" required>
                  {students?.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_names}</option>)}
                </select>
              </div>
              <button type="submit" className="btn ghost">Inscrire</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
