import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { applyDiscount, uploadDocument, changeEnrollmentStatus } from './actions';

export default async function FicheElevePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: student } = await supabase.from('students').select('*').eq('id', params.id).single();

  if (!student) {
    return <div className="page"><div className="error-box">Élève introuvable.</div></div>;
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, status, enrollment_date, created_at, academic_years(label), classes(name)')
    .eq('student_id', params.id)
    .order('enrollment_date', { ascending: false });

  const { data: fees } = await supabase
    .from('student_fees')
    .select(`
      id, amount_due,
      fee_assignments ( fee_types ( name ) ),
      student_fee_installments ( id, label, due_date, amount_due, amount_paid )
    `)
    .eq('student_id', params.id);

  const { data: documents } = await supabase
    .from('documents')
    .select('id, document_type, storage_path, uploaded_at')
    .eq('owner_type', 'student')
    .eq('owner_id', params.id)
    .order('uploaded_at', { ascending: false });

  const totalDue = fees?.reduce((sum, f) => sum + Number(f.amount_due), 0) ?? 0;
  const totalPaid = fees?.reduce(
    (sum, f) => sum + (f.student_fee_installments?.reduce((s: number, i: any) => s + Number(i.amount_paid), 0) ?? 0),
    0
  ) ?? 0;
  const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{student.last_name} {student.first_names}</h1>
          <div className="sub">Matricule {student.registration_number}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/dashboard/eleves/${student.id}/modifier`} className="btn ghost">Modifier la fiche</Link>
          <Link href={`/dashboard/paiements/nouveau?student_id=${student.id}`} className="btn primary">
            Enregistrer un paiement
          </Link>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Fiche élève</h2>
          <table className="data">
            <tbody>
              <tr><td>Sexe</td><td>{student.gender === 'M' ? 'Masculin' : 'Féminin'}</td></tr>
              <tr><td>Date de naissance</td><td>{student.birth_date ?? '—'}</td></tr>
              <tr><td>Lieu de naissance</td><td>{student.birth_place ?? '—'}</td></tr>
              <tr><td>Nationalité</td><td>{student.nationality ?? '—'}</td></tr>
              <tr><td>Adresse</td><td>{student.address ?? '—'}</td></tr>
              <tr><td>Statut</td><td><span className="badge paid">{student.status}</span></td></tr>
            </tbody>
          </table>

          <h3>Historique des inscriptions</h3>
          <table className="data">
            <thead><tr><th>Année</th><th>Classe</th><th>Statut</th><th>Date / heure</th><th></th></tr></thead>
            <tbody>
              {enrollments?.map((e: any) => (
                <tr key={e.id}>
                  <td>{e.academic_years?.label}</td>
                  <td>{e.classes?.name}</td>
                  <td><span className="badge pending">{e.status}</span></td>
                  <td style={{ fontSize: 11 }}>{new Date(e.created_at).toLocaleString('fr-FR')}</td>
                  <td>
                    <form action={changeEnrollmentStatus} style={{ display: 'flex', gap: 6 }}>
                      <input type="hidden" name="enrollment_id" value={e.id} />
                      <input type="hidden" name="student_id" value={student.id} />
                      <select name="status" defaultValue={e.status} style={{ fontSize: 12 }}>
                        <option value="inscrit">Inscrit</option>
                        <option value="en_attente">En attente</option>
                        <option value="transfere">Transféré</option>
                        <option value="exclu">Exclu</option>
                        <option value="annule">Annulé</option>
                        <option value="termine">Terminé</option>
                      </select>
                      <button type="submit" className="btn ghost">Changer</button>
                    </form>
                  </td>
                </tr>
              ))}
              {!enrollments?.length && (
                <tr><td colSpan={5}>
                  Aucune inscription. <Link href={`/dashboard/inscriptions/nouveau?student_id=${student.id}`}>Inscrire cet élève →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Situation financière</h2>
          <div style={{ marginBottom: 14 }}>
            <div className="hint">Payé : {totalPaid.toLocaleString('fr-FR')} FCFA — Reste : {(totalDue - totalPaid).toLocaleString('fr-FR')} FCFA</div>
            <div style={{ height: 6, background: 'var(--line)', marginTop: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)' }} />
            </div>
          </div>

          {fees?.map((f: any) => (
            <div key={f.id} style={{ marginBottom: 18 }}>
              <h3>{f.fee_assignments?.fee_types?.name}</h3>
              <table className="data">
                <thead><tr><th>Tranche</th><th className="num">Dû</th><th className="num">Payé</th><th>Statut</th></tr></thead>
                <tbody>
                  {f.student_fee_installments?.map((i: any) => {
                    const late = Number(i.amount_paid) < Number(i.amount_due) && new Date(i.due_date) < new Date();
                    const paid = Number(i.amount_paid) >= Number(i.amount_due);
                    return (
                      <tr key={i.id}>
                        <td>{i.label}</td>
                        <td className="num">{Number(i.amount_due).toLocaleString('fr-FR')}</td>
                        <td className="num">{Number(i.amount_paid).toLocaleString('fr-FR')}</td>
                        <td>
                          {paid && <span className="badge paid">Soldé</span>}
                          {!paid && late && <span className="badge late">En retard</span>}
                          {!paid && !late && <span className="badge pending">À venir</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {!fees?.length && <div className="hint">Aucun frais généré — l&apos;élève doit d&apos;abord être inscrit.</div>}

          <h3>Remise / exonération</h3>
          <form action={applyDiscount} className="form-grid">
            <input type="hidden" name="student_id" value={student.id} />
            <div className="f-item">
              <label htmlFor="student_fee_id">Frais concerné</label>
              <select id="student_fee_id" name="student_fee_id">
                {fees?.map((f: any) => <option key={f.id} value={f.id}>{f.fee_assignments?.fee_types?.name}</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="value">Montant (FCFA)</label>
              <input id="value" name="value" type="number" min="1" required />
            </div>
            <div className="f-item">
              <label htmlFor="reason">Motif</label>
              <input id="reason" name="reason" required />
            </div>
            <button type="submit" className="btn ghost">Soumettre pour validation</button>
          </form>
        </div>
      </div>

      <div className="panel">
        <h2>Documents</h2>
        <table className="data">
          <thead><tr><th>Type</th><th>Ajouté le</th><th></th></tr></thead>
          <tbody>
            {documents?.map((d) => (
              <tr key={d.id}>
                <td>{d.document_type}</td>
                <td>{new Date(d.uploaded_at).toLocaleDateString('fr-FR')}</td>
                <td>{d.storage_path}</td>
              </tr>
            ))}
            {!documents?.length && <tr><td colSpan={3}>Aucun document.</td></tr>}
          </tbody>
        </table>
        <form action={uploadDocument} className="form-grid" encType="multipart/form-data" style={{ marginTop: 12 }}>
          <input type="hidden" name="student_id" value={student.id} />
          <div className="f-item">
            <label htmlFor="document_type">Type de document</label>
            <input id="document_type" name="document_type" placeholder="Acte de naissance, certificat..." required />
          </div>
          <div className="f-item">
            <label htmlFor="file">Fichier</label>
            <input id="file" name="file" type="file" required />
          </div>
          <button type="submit" className="btn ghost">Téléverser</button>
        </form>
      </div>
    </div>
  );
}
