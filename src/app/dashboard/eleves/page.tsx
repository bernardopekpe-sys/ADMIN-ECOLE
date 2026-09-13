import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ElevesPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = searchParams?.q ?? '';

  let query = supabase
    .from('students')
    .select('id, registration_number, last_name, first_names, status')
    .order('last_name')
    .limit(50);

  if (q) {
    query = query.or(`last_name.ilike.%${q}%,first_names.ilike.%${q}%,registration_number.ilike.%${q}%`);
  }

  const { data: students } = await query;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Élèves</h1>
          <div className="sub">{students?.length ?? 0} résultat(s)</div>
        </div>
        <Link href="/dashboard/eleves/nouveau" className="btn primary">Nouvel élève</Link>
      </div>

      <div className="panel">
        <form className="form-grid full" style={{ marginBottom: 16 }}>
          <div className="f-item">
            <label htmlFor="q">Rechercher (nom, prénom, matricule)</label>
            <input id="q" name="q" defaultValue={q} />
          </div>
        </form>

        <table className="data">
          <thead>
            <tr><th>Matricule</th><th>Nom</th><th>Prénoms</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {students?.map((s) => (
              <tr key={s.id}>
                <td>{s.registration_number}</td>
                <td>{s.last_name}</td>
                <td>{s.first_names}</td>
                <td><span className="badge paid">{s.status}</span></td>
                <td><Link href={`/dashboard/eleves/${s.id}`}>Ouvrir →</Link></td>
              </tr>
            ))}
            {!students?.length && <tr><td colSpan={5}>Aucun élève trouvé.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
