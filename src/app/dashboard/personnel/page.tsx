import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PersonnelPage() {
  const supabase = createClient();
  const { data: personnel } = await supabase
    .from('personnel')
    .select('id, registration_number, last_name, first_names, role_function, status, base_salary')
    .order('last_name');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Personnel</h1>
          <div className="sub">{personnel?.length ?? 0} membre(s)</div>
        </div>
        <Link href="/dashboard/personnel/nouveau" className="btn primary">Nouveau membre</Link>
      </div>

      <div className="panel">
        <table className="data">
          <thead><tr><th>Matricule</th><th>Nom</th><th>Fonction</th><th className="num">Salaire de base</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {personnel?.map((p) => (
              <tr key={p.id}>
                <td>{p.registration_number}</td>
                <td>{p.last_name} {p.first_names}</td>
                <td>{p.role_function}</td>
                <td className="num">{Number(p.base_salary).toLocaleString('fr-FR')}</td>
                <td><span className="badge paid">{p.status}</span></td>
                <td><Link href={`/dashboard/personnel/${p.id}`}>Ouvrir →</Link></td>
              </tr>
            ))}
            {!personnel?.length && <tr><td colSpan={6}>Aucun membre du personnel enregistré.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
