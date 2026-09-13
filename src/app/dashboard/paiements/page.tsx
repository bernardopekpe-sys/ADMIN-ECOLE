import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PaiementsPage() {
  const supabase = createClient();

  const { data: payments } = await supabase
    .from('payments')
    .select('id, payment_number, payment_date, amount, payment_method, status, students(last_name, first_names)')
    .order('payment_date', { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Paiements</h1>
          <div className="sub">Encaissements récents</div>
        </div>
        <Link href="/dashboard/paiements/nouveau" className="btn primary">Nouveau paiement</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <a href="/api/exports/paiements" className="btn ghost">Exporter en CSV (Excel)</a>
      </div>

      <div className="panel">
        <table className="data">
          <thead><tr><th>N°</th><th>Date</th><th>Élève</th><th className="num">Montant</th><th>Mode</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {payments?.map((p: any) => (
              <tr key={p.id}>
                <td>{p.payment_number}</td>
                <td>{p.payment_date}</td>
                <td>{p.students?.last_name} {p.students?.first_names}</td>
                <td className="num">{Number(p.amount).toLocaleString('fr-FR')}</td>
                <td>{p.payment_method}</td>
                <td>{p.status === 'validated' ? <span className="badge paid">Validé</span> : <span className="badge late">Annulé</span>}</td>
                <td><Link href={`/dashboard/paiements/${p.id}`}>Reçu →</Link></td>
              </tr>
            ))}
            {!payments?.length && <tr><td colSpan={7}>Aucun paiement enregistré.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
