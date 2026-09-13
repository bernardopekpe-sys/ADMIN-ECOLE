import { createClient } from '@/lib/supabase/server';
import { createSubscription, recordAttendance } from './actions';

export default async function CantinePage() {
  const supabase = createClient();
  const { data: years } = await supabase.from('academic_years').select('id, label, is_current').order('start_date', { ascending: false });
  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  const { data: students } = await supabase.from('students').select('id, last_name, first_names').order('last_name');
  const { data: subscriptions } = await supabase
    .from('cantine_subscriptions')
    .select('id, status, student_id, students(last_name, first_names)')
    .eq('academic_year_id', currentYear?.id ?? '');

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayAttendance } = await supabase
    .from('cantine_attendance')
    .select('student_id')
    .eq('attendance_date', today);
  const presentIds = new Set((todayAttendance ?? []).map((a) => a.student_id));

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Cantine</h1><div className="sub">Abonnés et présence du jour — tarifs et paiements gérés via le module Frais</div></div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Élèves abonnés — {currentYear?.label}</h2>
          <table className="data">
            <tbody>
              {subscriptions?.map((s: any) => <tr key={s.id}><td>{s.students?.last_name} {s.students?.first_names}</td><td>{s.status}</td></tr>)}
              {!subscriptions?.length && <tr><td colSpan={2}>Aucun abonné.</td></tr>}
            </tbody>
          </table>
          <form action={createSubscription} className="form-grid" style={{ marginTop: 12 }}>
            <input type="hidden" name="academic_year_id" value={currentYear?.id ?? ''} />
            <div className="f-item">
              <label htmlFor="student_id">Élève</label>
              <select id="student_id" name="student_id" required>
                {students?.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_names}</option>)}
              </select>
            </div>
            <button type="submit" className="btn ghost">Abonner</button>
          </form>
        </div>

        <div className="panel">
          <h2>Présence du jour — {today}</h2>
          <table className="data">
            <tbody>
              {subscriptions?.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.students?.last_name} {s.students?.first_names}</td>
                  <td>
                    {presentIds.has(s.student_id) ? (
                      <span className="badge paid">Présent</span>
                    ) : (
                      <form action={recordAttendance}>
                        <input type="hidden" name="student_id" value={s.student_id} />
                        <button type="submit" className="btn ghost">Marquer présent</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {!subscriptions?.length && <tr><td colSpan={2}>Aucun abonné pour cette année.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
