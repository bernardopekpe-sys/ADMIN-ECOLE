import { createClient } from '@/lib/supabase/server';
import { createFeeType, createFeeAssignment } from './actions';

export default async function FraisPage() {
  const supabase = createClient();

  const [{ data: feeTypes }, { data: years }, { data: cycles }, { data: levels }, { data: classes }, { data: assignments }] =
    await Promise.all([
      supabase.from('fee_types').select('id, name, is_mandatory').order('name'),
      supabase.from('academic_years').select('id, label, is_current').order('start_date', { ascending: false }),
      supabase.from('cycles').select('id, name'),
      supabase.from('levels').select('id, name'),
      supabase.from('classes').select('id, name'),
      supabase.from('fee_assignments')
        .select('id, amount, installment_periodicity, fee_types(name), academic_years(label), classes(name), levels(name), cycles(name)')
        .order('created_at', { ascending: false })
    ]);

  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Frais</h1>
          <div className="sub">Types de frais et montants applicables par classe/niveau/cycle</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Types de frais</h2>
            <table className="data">
              <tbody>
                {feeTypes?.map((f) => (
                  <tr key={f.id}><td>{f.name}</td><td>{f.is_mandatory ? 'Obligatoire' : 'Facultatif'}</td></tr>
                ))}
                {!feeTypes?.length && <tr><td>Aucun type de frais créé.</td></tr>}
              </tbody>
            </table>
            <form action={createFeeType} className="form-grid" style={{ marginTop: 14 }}>
              <div className="f-item">
                <label htmlFor="name">Nouveau type</label>
                <input id="name" name="name" placeholder="Scolarité, Cantine, Transport..." required />
              </div>
              <div className="f-item">
                <label htmlFor="is_mandatory">Caractère</label>
                <select id="is_mandatory" name="is_mandatory" defaultValue="true">
                  <option value="true">Obligatoire</option>
                  <option value="false">Facultatif</option>
                </select>
              </div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <h2>Barème — {currentYear?.label}</h2>
          <table className="data">
            <thead><tr><th>Frais</th><th>Périmètre</th><th className="num">Montant</th><th>Périodicité</th></tr></thead>
            <tbody>
              {assignments?.map((a: any) => (
                <tr key={a.id}>
                  <td>{a.fee_types?.name}</td>
                  <td>{a.classes?.name ?? a.levels?.name ?? a.cycles?.name ?? 'Tout l\u2019établissement'}</td>
                  <td className="num">{Number(a.amount).toLocaleString('fr-FR')}</td>
                  <td>{a.installment_periodicity}</td>
                </tr>
              ))}
              {!assignments?.length && <tr><td colSpan={4}>Aucun barème défini pour cette année.</td></tr>}
            </tbody>
          </table>

          <h3>Définir un montant</h3>
          <form action={createFeeAssignment} className="form-grid">
            <input type="hidden" name="academic_year_id" value={currentYear?.id ?? ''} />
            <div className="f-item">
              <label htmlFor="fee_type_id">Type de frais</label>
              <select id="fee_type_id" name="fee_type_id" required>
                {feeTypes?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="amount">Montant (FCFA)</label>
              <input id="amount" name="amount" type="number" min="0" required />
            </div>
            <div className="f-item">
              <label htmlFor="installment_periodicity">Périodicité</label>
              <select id="installment_periodicity" name="installment_periodicity" defaultValue="monthly">
                <option value="single">En une fois</option>
                <option value="monthly">Mensuelle</option>
                <option value="termly">Par trimestre/palier</option>
                <option value="custom">Personnalisée</option>
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="cycle_id">Cycle (optionnel)</label>
              <select id="cycle_id" name="cycle_id" defaultValue="">
                <option value="">— Tout l&apos;établissement —</option>
                {cycles?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="level_id">Niveau (optionnel, plus spécifique que le cycle)</label>
              <select id="level_id" name="level_id" defaultValue="">
                <option value="">—</option>
                {levels?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="class_id">Classe (optionnel, le plus spécifique)</label>
              <select id="class_id" name="class_id" defaultValue="">
                <option value="">—</option>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn ghost" disabled={!currentYear}>Ajouter au barème</button>
          </form>
        </div>
      </div>
    </div>
  );
}
