import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ElevesPage({ searchParams }: { searchParams: { q?: string; cycle_id?: string; level_id?: string; class_id?: string } }) {
  const supabase = createClient();

  const [{ data: cycles }, { data: levels }, { data: classes }, { data: years }] = await Promise.all([
    supabase.from('cycles').select('id, name').order('display_order'),
    supabase.from('levels').select('id, name, cycle_id').order('display_order'),
    supabase.from('classes').select('id, name, level_id, academic_year_id').order('name'),
    supabase.from('academic_years').select('id, is_current')
  ]);

  const currentYearId = years?.find((y) => y.is_current)?.id;

  const filteredLevels = searchParams?.cycle_id ? levels?.filter((l) => l.cycle_id === searchParams.cycle_id) : levels;
  const filteredClasses = searchParams?.level_id ? classes?.filter((c) => c.level_id === searchParams.level_id) : classes;

  // Base : élèves + leur inscription courante (classe, niveau, cycle)
  let query = supabase
    .from('students')
    .select(`
      id, registration_number, last_name, first_names, gender, birth_date, birth_place, nationality, status,
      enrollments!inner ( status, class_id, academic_year_id, classes ( id, name, level_id, levels ( id, name, cycle_id, cycles ( id, name ) ) ) )
    `)
    .order('last_name')
    .limit(200);

  if (searchParams?.q) {
    query = query.or(`last_name.ilike.%${searchParams.q}%,first_names.ilike.%${searchParams.q}%,registration_number.ilike.%${searchParams.q}%`);
  }
  if (searchParams?.class_id) {
    query = query.eq('enrollments.class_id', searchParams.class_id);
  } else if (currentYearId) {
    query = query.eq('enrollments.academic_year_id', currentYearId);
  }

  const { data: students } = await query;

  // Filtre supplémentaire niveau/cycle côté application (car ça dépend d'une jointure profonde)
  const rows = (students ?? []).filter((s: any) => {
    const enr = s.enrollments?.[0];
    if (!enr) return false;
    if (searchParams?.level_id && enr.classes?.level_id !== searchParams.level_id) return false;
    if (searchParams?.cycle_id && enr.classes?.levels?.cycle_id !== searchParams.cycle_id) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Élèves</h1>
          <div className="sub">{rows.length} résultat(s) — année en cours</div>
        </div>
        <Link href="/dashboard/eleves/nouveau" className="btn primary">Nouvel élève</Link>
      </div>

      <div className="panel">
        <form className="form-grid" style={{ marginBottom: 16 }}>
          <div className="f-item">
            <label htmlFor="q">Rechercher (nom, prénom, matricule)</label>
            <input id="q" name="q" defaultValue={searchParams?.q ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="cycle_id">Cycle</label>
            <select id="cycle_id" name="cycle_id" defaultValue={searchParams?.cycle_id ?? ''}>
              <option value="">Tous</option>
              {cycles?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="level_id">Niveau</label>
            <select id="level_id" name="level_id" defaultValue={searchParams?.level_id ?? ''}>
              <option value="">Tous</option>
              {filteredLevels?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="class_id">Classe</label>
            <select id="class_id" name="class_id" defaultValue={searchParams?.class_id ?? ''}>
              <option value="">Toutes</option>
              {filteredClasses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
                   <button type="submit" className="btn ghost">Filtrer</button>
          <a href={`/dashboard/eleves/liste-imprimable?cycle_id=${searchParams?.cycle_id ?? ''}&level_id=${searchParams?.level_id ?? ''}&class_id=${searchParams?.class_id ?? ''}`} className="btn ghost">Imprimer cette liste</a>
        </form>

        <table className="data">
          <thead>
            <tr>
              <th>Matricule</th><th>Nom</th><th>Prénoms</th><th>Sexe</th>
              <th>Naissance</th><th>Nationalité</th><th>Cycle</th><th>Niveau</th><th>Classe</th>
              <th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s: any) => {
              const enr = s.enrollments?.[0];
              return (
                <tr key={s.id}>
                  <td>{s.registration_number}</td>
                  <td>{s.last_name}</td>
                  <td>{s.first_names}</td>
                  <td>{s.gender === 'M' ? 'M' : 'F'}</td>
                  <td>{s.birth_date ?? '—'} {s.birth_place ? `(${s.birth_place})` : ''}</td>
                  <td>{s.nationality ?? '—'}</td>
                  <td>{enr?.classes?.levels?.cycles?.name ?? '—'}</td>
                  <td>{enr?.classes?.levels?.name ?? '—'}</td>
                  <td>{enr?.classes?.name ?? '—'}</td>
                  <td><span className="badge paid">{s.status}</span></td>
                  <td><Link href={`/dashboard/eleves/${s.id}`}>Ouvrir →</Link></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={11}>Aucun élève trouvé pour ces critères.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
