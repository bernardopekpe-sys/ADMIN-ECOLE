import { createClient } from '@/lib/supabase/server';
import { createEvaluation, saveGrades } from './actions';

export default async function NotesPage({ searchParams }: { searchParams: { evaluation_id?: string } }) {
  const supabase = createClient();
  const { data: classSubjects } = await supabase
    .from('class_subjects')
    .select('id, classes(id, name), subjects(name)');

  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('id, label, eval_date, max_score, class_subjects(classes(name), subjects(name))')
    .order('eval_date', { ascending: false })
    .limit(20);

  let evaluation: any = null;
  let students: any[] = [];
  let grades: Record<string, number> = {};

  if (searchParams?.evaluation_id) {
    const { data: ev } = await supabase
      .from('evaluations')
      .select('id, label, max_score, class_subjects(class_id, classes(name), subjects(name))')
      .eq('id', searchParams.evaluation_id)
      .single();
    evaluation = ev;

    if (ev) {
      const { data: s } = await supabase
        .from('students')
        .select('id, last_name, first_names, enrollments!inner(class_id, status)')
        .eq('enrollments.class_id', (ev as any).class_subjects.class_id)
        .eq('enrollments.status', 'inscrit');
      students = s ?? [];

      const { data: g } = await supabase.from('grades').select('student_id, score').eq('evaluation_id', ev.id);
      grades = Object.fromEntries((g ?? []).map((x) => [x.student_id, x.score]));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Notes</h1><div className="sub">Évaluations et saisie des notes par classe/matière</div></div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Évaluations récentes</h2>
            <table className="data">
              <tbody>
                {evaluations?.map((e: any) => (
                  <tr key={e.id}>
                    <td>{e.class_subjects?.classes?.name} — {e.class_subjects?.subjects?.name}</td>
                    <td>{e.label}</td>
                    <td><a href={`/dashboard/pedagogie/notes?evaluation_id=${e.id}`}>Saisir →</a></td>
                  </tr>
                ))}
                {!evaluations?.length && <tr><td>Aucune évaluation créée.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Nouvelle évaluation</h2>
            <form action={createEvaluation} className="form-grid full">
              <div className="f-item">
                <label htmlFor="class_subject_id">Classe / matière</label>
                <select id="class_subject_id" name="class_subject_id" required>
                  {classSubjects?.map((c: any) => <option key={c.id} value={c.id}>{c.classes?.name} — {c.subjects?.name}</option>)}
                </select>
              </div>
              <div className="f-item"><label htmlFor="label">Libellé</label><input id="label" name="label" placeholder="Devoir 1, Composition..." required /></div>
              <div className="f-item"><label htmlFor="eval_date">Date</label><input id="eval_date" name="eval_date" type="date" required /></div>
              <div className="f-item"><label htmlFor="max_score">Barème</label><input id="max_score" name="max_score" type="number" defaultValue={20} /></div>
              <button type="submit" className="btn ghost">Créer</button>
            </form>
          </div>
        </div>

        {evaluation && (
          <div className="panel">
            <h2>{evaluation.class_subjects?.classes?.name} — {evaluation.class_subjects?.subjects?.name} — {evaluation.label}</h2>
            <form action={saveGrades}>
              <input type="hidden" name="evaluation_id" value={evaluation.id} />
              {students.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span>{s.last_name} {s.first_names}</span>
                  <input type="number" step="0.5" min="0" max={evaluation.max_score} name={`score_${s.id}`}
                    defaultValue={grades[s.id] ?? ''} style={{ width: 80, border: '1px solid var(--line)', padding: '5px 8px', textAlign: 'right' }} />
                </div>
              ))}
              {!students.length && <div className="hint">Aucun élève dans cette classe.</div>}
              <button type="submit" className="btn primary" style={{ marginTop: 14 }}>Enregistrer les notes</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
