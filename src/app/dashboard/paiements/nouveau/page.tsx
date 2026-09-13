import { createClient } from '@/lib/supabase/server';
import { createPayment } from '../actions';

export default async function NouveauPaiementPage({ searchParams }: { searchParams: { student_id?: string } }) {
  const supabase = createClient();
  const studentId = searchParams?.student_id;

  const { data: students } = await supabase
    .from('students')
    .select('id, registration_number, last_name, first_names')
    .order('last_name');

  let student: any = null;
  let installments: any[] = [];
  let cashSessions: any[] = [];
  let guardians: any[] = [];

  if (studentId) {
    const [{ data: s }, { data: fees }, { data: sessions }, { data: g }] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('student_fees')
        .select('id, fee_assignments(fee_types(name)), student_fee_installments(id, label, due_date, amount_due, amount_paid)')
        .eq('student_id', studentId),
      supabase.from('cash_sessions').select('id, cash_registers(name)').eq('status', 'ouverte'),
      supabase.from('student_guardians')
        .select('is_financial_guardian, guardians(id, last_name, first_names)')
        .eq('student_id', studentId)
    ]);
    student = s;
    installments = (fees ?? []).flatMap((f: any) =>
      (f.student_fee_installments ?? [])
        .filter((i: any) => Number(i.amount_paid) < Number(i.amount_due))
        .map((i: any) => ({ ...i, fee_name: f.fee_assignments?.fee_types?.name }))
    );
    cashSessions = sessions ?? [];
    guardians = g ?? [];
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouveau paiement</h1>
          <div className="sub">{student ? `${student.last_name} ${student.first_names}` : 'Sélectionnez un élève'}</div>
        </div>
      </div>

      {!studentId && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <form>
            <div className="f-item">
              <label htmlFor="student_id">Élève</label>
              <select id="student_id" name="student_id" defaultValue="" required>
                <option value="" disabled>Sélectionner…</option>
                {students?.map((s) => (
                  <option key={s.id} value={s.id}>{s.last_name} {s.first_names} ({s.registration_number})</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn primary" style={{ marginTop: 14 }}>Continuer</button>
          </form>
        </div>
      )}

      {studentId && (
        <div className="panel" style={{ maxWidth: 640 }}>
          {!cashSessions.length && (
            <div className="error-box">
              Aucune session de caisse ouverte. Ouvrez une caisse avant d&apos;enregistrer un paiement en espèces.
            </div>
          )}

          <form action={createPayment}>
            <input type="hidden" name="student_id" value={studentId} />

            <div className="form-grid">
              <div className="f-item">
                <label htmlFor="guardian_id">Payeur (responsable enregistré)</label>
                <select id="guardian_id" name="guardian_id">
                  <option value="">— Payeur tiers (préciser ci-dessous) —</option>
                  {guardians.map((g: any) => (
                    <option key={g.guardians.id} value={g.guardians.id}>
                      {g.guardians.last_name} {g.guardians.first_names} {g.is_financial_guardian ? '(financier)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f-item">
                <label htmlFor="payer_name">Nom du payeur (si tiers)</label>
                <input id="payer_name" name="payer_name" />
              </div>
              <div className="f-item">
                <label htmlFor="payment_method">Mode de paiement</label>
                <select id="payment_method" name="payment_method" defaultValue="especes">
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="virement">Virement</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="f-item">
                <label htmlFor="cash_session_id">Caisse</label>
                <select id="cash_session_id" name="cash_session_id" required={cashSessions.length > 0}>
                  {cashSessions.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.cash_registers?.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h3>Tranches impayées</h3>
            {!installments.length && <div className="hint">Aucune tranche impayée pour cet élève.</div>}
            {installments.map((i) => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span>{i.fee_name} — {i.label} <span className="hint" style={{ display: 'inline' }}>(reste {(Number(i.amount_due) - Number(i.amount_paid)).toLocaleString('fr-FR')})</span></span>
                <input
                  type="number" min="0" step="1" name={`allocation_${i.id}`}
                  placeholder="0"
                  style={{ width: 110, border: '1px solid var(--line)', padding: '5px 8px', textAlign: 'right' }}
                />
              </div>
            ))}

            <button type="submit" className="btn primary" style={{ marginTop: 18 }} disabled={!installments.length}>
              Valider et générer le reçu
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
