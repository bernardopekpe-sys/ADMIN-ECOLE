import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createPeriod } from './actions';

export default async function PaiePage() {
  const supabase = createClient();
  const { data: periods } = await supabase
    .from('payroll_periods')
    .select('id, label, period_month, status')
    .order('period_month', { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Paie</h1>
          <div className="sub">Préparation, validation et paiement mensuels</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Périodes</h2>
          <table className="data">
            <thead><tr><th>Libellé</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {periods?.map((p) => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td><span className="badge pending">{p.status}</span></td>
                  <td><Link href={`/dashboard/paie/${p.id}`}>Ouvrir →</Link></td>
                </tr>
              ))}
              {!periods?.length && <tr><td colSpan={3}>Aucune période créée.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Nouvelle période</h2>
          <form action={createPeriod} className="form-grid full">
            <div className="f-item">
              <label htmlFor="label">Libellé</label>
              <input id="label" name="label" placeholder="Septembre 2026" required />
            </div>
            <div className="f-item">
              <label htmlFor="period_month">Mois</label>
              <input id="period_month" name="period_month" type="date" required />
            </div>
            <button type="submit" className="btn primary">Créer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
