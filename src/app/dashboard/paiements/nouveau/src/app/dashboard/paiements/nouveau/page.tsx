import { createClient } from '@/lib/supabase/server';
import { createPayment } from '../actions';

export default async function NouveauPaiementPage({
  searchParams
}: {
  searchParams: { q?: string; guardian_id?: string; student_id?: string };
}) {
  const supabase = createClient();

  // ---------- Étape recherche : ni responsable ni élève encore choisi ----------
  if (!searchParams?.guardian_id && !searchParams?.student_id) {
    let guardianResults: any[] = [];
    let studentResults: any[] = [];

    if (searchParams?.q) {
      const [{ data: g }, { data: s }] = await Promise.all([
        supabase.from('guardians').select('id, last_name, first_names, phone').or(`last_name.ilike.%${searchParams.q}%,first_names.ilike.%${searchParams.q}%`).limit(10),
        supabase.from('students').select('id, last_name, first_names, registration_number').or(`last_name.ilike.%${searchParams.q}%,first_names.ilike.%${searchParams.q}%,registration_number.ilike.%${searchParams.q}%`).limit(10)
      ]);
      guardianResults = g ?? [];
      studentResults = s ?? [];
    }

    return (
      <div className="page">
        <div className="page-head"><div><h1>Nouveau paiement</h1><div className="sub">Recherchez le responsable qui paie, ou directement un élève</div></div></div>

        <div className="panel" style={{ maxWidth: 560 }}>
          <form className="form-grid full">
            <div className="f-item">
              <label htmlFor="q">Nom du responsable, ou nom/matricule de l&apos;élève</label>
              <input id="q" name="q" defaultValue={searchParams?.q ?? ''} autoFocus />
            </div>
            <button type="submit" className="btn primary">Rechercher</button>
          </form>

          {!!guardianResults.length && (
            <>
              <h3>Responsables</h3>
              <table className="data">
                <tbody>
                  {guardianResults.map((g) => (
                    <tr key={g.id}>
                      <td>{g.last_name} {g.first_names}</td>
                      <td>{g.phone ?? '—'}</td>
                      <td><a href={`/dashboard/paiements/nouveau?guardian_id=${g.id}`}>Sélectionner (voir tous ses enfants) →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!!studentResults.length && (
            <>
              <h3>Élèves</h3>
              <table className="data">
                <tbody>
                  {studentResults.map((s) => (
                    <tr key={s.id}>
                      <td>{s.last_name} {s.first_names}</td>
                      <td>{s.registration_number}</td>
                      <td><a href={`/dashboard/paiements/nouveau?student_id=${s.id}`}>Sélectionner cet élève →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- Détermine la liste des enfants concernés ----------
  let children: { id: string; last_name: string; first_names: string }[] = [];
  let guardianInfo: any = null;

  if (searchParams.guardian_id) {
    const { data: g } = await supabase.from('guardians').select('id, last_name, first_names').eq('id', searchParams.guardian_id).single();
    guardianInfo = g;
    const { data: links } = await supabase
      .from('student_guardians')
      .select('students(id, last_name, first_names)')
      .eq('guardian_id', searchParams.guardian_id);
    children = (links ?? []).map((l: any) => l.students).filter(Boolean);
  } else if (searchParams.student_id) {
    const { data: s } = await supabase.from('students').select('id, last_name, first_names').eq('id', searchParams.student_id).single();
    if (s) children = [s];

    // Propose d'inclure la fratrie si un responsable financier est enregistré
    const { data: links } = await supabase
      .from('student_guardians')
      .select('guardians(id, last_name, first_names)')
      .eq('student_id', searchParams.student_id)
      .eq('is_financial_guardian', true);
    guardianInfo = (links ?? [])[0]?.guardians ?? null;
  }

  const childIds = children.map((c) => c.id);

  const { data: cashSessions } = await supabase.from('cash_sessions').select('id, cash_registers(name)').eq('status', 'ouverte');

  let installmentsByChild: Record<string, any[]> = {};
  if (childIds.length) {
    const { data: fees } = await supabase
      .from('student_fees')
      .select('student_id, fee_assignments(fee_types(name)), student_fee_installments(id, label, due_date, amount_due, amount_paid)')
      .in('student_id', childIds);

    for (const f of fees ?? []) {
      const unpaid = (f.student_fee_installments ?? []).filter((i: any) => Number(i.amount_paid) < Number(i.amount_due));
      if (!unpaid.length) continue;
      if (!installmentsByChild[f.student_id]) installmentsByChild[f.student_id] = [];
      for (const i of unpaid) {
        installmentsByChild[f.student_id].push({ ...i, fee_name: (f as any).fee_assignments?.fee_types?.name });
      }
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouveau paiement</h1>
          <div className="sub">
            {guardianInfo ? `Responsable : ${guardianInfo.last_name} ${guardianInfo.first_names}` : 'Élève sélectionné'}
            {' — '}{children.length} enfant(s) concerné(s)
          </div>
        </div>
        <a href="/dashboard/paiements/nouveau" className="btn ghost">Changer de recherche</a>
      </div>

      {!cashSessions?.length && (
        <div className="error-box">Aucune session de caisse ouverte. Ouvrez une caisse avant un paiement en espèces.</div>
      )}

      {searchParams.student_id && guardianInfo && (
        <div className="panel" style={{ background: 'var(--accent-soft)', marginBottom: 16 }}>
          Ce responsable ({guardianInfo.last_name} {guardianInfo.first_names}) a peut-être d&apos;autres enfants inscrits.
          {' '}<a href={`/dashboard/paiements/nouveau?guardian_id=${guardianInfo.id}`}>Voir tous ses enfants →</a>
        </div>
      )}

      <div className="panel" style={{ maxWidth: 720 }}>
        <form action={createPayment}>
          <input type="hidden" name="primary_student_id" value={children[0]?.id ?? ''} />
          {guardianInfo && <input type="hidden" name="guardian_id" value={guardianInfo.id} />}

          <div className="form-grid">
            <div className="f-item">
              <label htmlFor="payer_name">Nom du payeur</label>
              <input id="payer_name" name="payer_name" defaultValue={guardianInfo ? `${guardianInfo.last_name} ${guardianInfo.first_names}` : ''} />
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
              <select id="cash_session_id" name="cash_session_id" required={!!cashSessions?.length}>
                {cashSessions?.map((s: any) => <option key={s.id} value={s.id}>{s.cash_registers?.name}</option>)}
              </select>
            </div>
          </div>

          {children.map((child) => {
            const items = installmentsByChild[child.id] ?? [];
            if (!items.length) return null;
            return (
              <div key={child.id} style={{ marginTop: 20 }}>
                <h3>{child.last_name} {child.first_names}</h3>
                {items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                    <span>{i.fee_name} — {i.label} <span className="hint" style={{ display: 'inline' }}>(reste {(Number(i.amount_due) - Number(i.amount_paid)).toLocaleString('fr-FR')})</span></span>
                    <input type="number" min="0" step="1" name={`allocation_${i.id}`} placeholder="0"
                      style={{ width: 110, border: '1px solid var(--line)', padding: '5px 8px', textAlign: 'right' }} />
                  </div>
                ))}
              </div>
            );
          })}

          {!Object.keys(installmentsByChild).length && <div className="hint" style={{ marginTop: 16 }}>Aucune tranche impayée pour ce(s) enfant(s).</div>}

          <button type="submit" className="btn primary" style={{ marginTop: 20 }} disabled={!Object.keys(installmentsByChild).length}>
            Valider et générer le reçu unique
          </button>
        </form>
      </div>
    </div>
  );
}
