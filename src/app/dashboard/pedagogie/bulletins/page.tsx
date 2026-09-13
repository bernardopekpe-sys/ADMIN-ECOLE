import { createClient } from '@/lib/supabase/server';

export default async function BulletinsPage({ searchParams }: { searchParams: { class_id?: string; study_period_id?: string } }) {
  const supabase = createClient();

  const { data: classes } = await supabase.from('classes').select('id, name').order('name');
  const { data: periods } = await supabase.from('study_periods').select('id, label, academic_year_id').order('period_number');

  let rows: { studentId: string; name: string; average: number; details: { subject: string; average: number; coefficient: number }[] }[] = [];

  if (searchParams?.class_id && searchParams?.study_period_id) {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select('id, coefficient, subjects(name)')
      .eq('class_id', searchParams.class_id);

    const { data: students } = await supabase
      .from('students')
      .select('id, last_name, first_names, enrollments!inner(class_id, status)')
      .eq('enrollments.class_id', searchParams.class_id)
      .eq('enrollments.status', 'inscrit');

    const classSubjectIds = (classSubjects ?? []).map((cs) => cs.id);

    const { data: evaluations } = classSubjectIds.length
      ? await supabase
          .from('evaluations')
          .select('id, max_score, class_subject_id')
          .in('class_subject_id', classSubjectIds)
          .eq('study_period_id', searchParams.study_period_id)
      : { data: [] as any[] };

    const evaluationIds = (evaluations ?? []).map((e) => e.id);
    const { data: grades } = evaluationIds.length
      ? await supabase.from('grades').select('evaluation_id, student_id, score').in('evaluation_id', evaluationIds)
      : { data: [] as any[] };

    rows = (students ?? []).map((s: any) => {
      const details = (classSubjects ?? []).map((cs: any) => {
        const evalsForSubject = (evaluations ?? []).filter((e) => e.class_subject_id === cs.id);
        const scores = evalsForSubject
          .map((e) => {
            const g = (grades ?? []).find((gr) => gr.evaluation_id === e.id && gr.student_id === s.id);
            return g?.score != null ? (Number(g.score) / Number(e.max_score)) * 20 : null;
          })
          .filter((x): x is number => x !== null);
        const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { subject: cs.subjects?.name ?? '—', average, coefficient: Number(cs.coefficient) };
      });

      const totalCoef = details.reduce((s2, d) => s2 + d.coefficient, 0) || 1;
      const weighted = details.reduce((s2, d) => s2 + d.average * d.coefficient, 0) / totalCoef;

      return { studentId: s.id, name: `${s.last_name} ${s.first_names}`, average: weighted, details };
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Bulletins — moyennes</h1>
          <div className="sub">Moyenne pondérée par coefficient, sur 20, par période d&apos;étude</div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 480, marginBottom: 16 }}>
        <form className="form-grid">
          <div className="f-item">
            <label htmlFor="class_id">Classe</label>
            <select id="class_id" name="class_id" defaultValue={searchParams?.class_id ?? ''} required>
              <option value="" disabled>Sélectionner…</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="study_period_id">Période</label>
            <select id="study_period_id" name="study_period_id" defaultValue={searchParams?.study_period_id ?? ''} required>
              <option value="" disabled>Sélectionner…</option>
              {periods?.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn ghost">Afficher</button>
        </form>
      </div>

      {!!rows.length && (
        <div className="panel">
          <table className="data">
            <thead><tr><th>Élève</th><th>Détail par matière</th><th className="num">Moyenne générale</th></tr></thead>
            <tbody>
              {rows.sort((a, b) => b.average - a.average).map((r) => (
                <tr key={r.studentId}>
                  <td>{r.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {r.details.map((d) => `${d.subject}: ${d.average.toFixed(1)}/20 (coef. ${d.coefficient})`).join(' · ')}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{r.average.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {searchParams?.class_id && searchParams?.study_period_id && !rows.length && (
        <div className="hint">Aucune donnée pour cette combinaison classe/période.</div>
      )}
    </div>
  );
}
