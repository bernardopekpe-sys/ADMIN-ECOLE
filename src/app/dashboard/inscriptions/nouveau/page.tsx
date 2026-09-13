import { createClient } from '@/lib/supabase/server';
import { createEnrollment } from '../actions';

export default async function NouvelleInscriptionPage({ searchParams }: { searchParams: { student_id?: string } }) {
  const supabase = createClient();

  const [{ data: students }, { data: years }, { data: classes }] = await Promise.all([
    supabase.from('students').select('id, registration_number, last_name, first_names').order('last_name'),
    supabase.from('academic_years').select('id, label, is_current').order('start_date', { ascending: false }),
    supabase.from('classes').select('id, name, academic_year_id').order('name')
  ]);

  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouvelle inscription</h1>
          <div className="sub">Distincte de la fiche élève — une par année scolaire</div>
        </div>
      </div>

      <form action={createEnrollment} className="panel" style={{ maxWidth: 640 }}>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="student_id">Élève</label>
            <select id="student_id" name="student_id" defaultValue={searchParams?.student_id ?? ''} required>
              <option value="" disabled>Sélectionner…</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>{s.last_name} {s.first_names} ({s.registration_number})</option>
              ))}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="academic_year_id">Année scolaire</label>
            <select id="academic_year_id" name="academic_year_id" defaultValue={currentYear?.id} required>
              {years?.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="class_id">Classe</label>
            <select id="class_id" name="class_id" required>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="enrollment_type">Type</label>
            <select id="enrollment_type" name="enrollment_type" defaultValue="reinscription">
              <option value="inscription">Nouvelle inscription</option>
              <option value="reinscription">Réinscription</option>
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="is_new">Nouvel élève ?</label>
            <select id="is_new" name="is_new" defaultValue="false">
              <option value="false">Non — ancien élève</option>
              <option value="true">Oui — nouvel élève</option>
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="is_repeater">Redoublant ?</label>
            <select id="is_repeater" name="is_repeater" defaultValue="false">
              <option value="false">Non</option>
              <option value="true">Oui</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Confirmer l&apos;inscription
        </button>
        <div className="hint">
          Les frais applicables à la classe seront générés automatiquement dès la confirmation.
        </div>
      </form>
    </div>
  );
}
