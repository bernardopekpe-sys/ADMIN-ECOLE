import { createClient } from '@/lib/supabase/server';
import { updateStudent } from './actions';

export default async function ModifierElevePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: student } = await supabase.from('students').select('*').eq('id', params.id).single();

  if (!student) return <div className="page"><div className="error-box">Élève introuvable.</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Modifier — {student.last_name} {student.first_names}</h1>
          <div className="sub">Fiche élève</div>
        </div>
      </div>

      <form action={updateStudent} className="panel" style={{ maxWidth: 640 }}>
        <input type="hidden" name="student_id" value={student.id} />
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="registration_number">Matricule</label>
            <input id="registration_number" name="registration_number" defaultValue={student.registration_number} required />
          </div>
          <div className="f-item">
            <label htmlFor="gender">Sexe</label>
            <select id="gender" name="gender" defaultValue={student.gender} required>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div className="f-item">
