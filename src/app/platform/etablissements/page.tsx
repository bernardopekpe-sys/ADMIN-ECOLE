import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function PlatformSchoolsPage() {
  const admin = createAdminClient();
  const { data: schools } = await admin
    .from('schools')
    .select('id, official_name, code, city, is_active, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Établissements</h1>
          <div className="sub">{schools?.length ?? 0} établissement(s) sur la plateforme</div>
        </div>
        <Link href="/platform/etablissements/nouveau" className="btn primary">Nouvel établissement</Link>
      </div>

      <div className="panel">
        <table className="data">
          <thead><tr><th>Nom</th><th>Code</th><th>Ville</th><th>Statut</th></tr></thead>
          <tbody>
            {schools?.map((s) => (
              <tr key={s.id}>
                <td>{s.official_name}</td>
                <td>{s.code}</td>
                <td>{s.city ?? '—'}</td>
                <td><span className={`badge ${s.is_active ? 'paid' : 'late'}`}>{s.is_active ? 'Actif' : 'Suspendu'}</span></td>
              </tr>
            ))}
            {!schools?.length && <tr><td colSpan={4}>Aucun établissement.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
