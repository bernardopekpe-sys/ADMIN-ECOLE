import { createClient } from '@/lib/supabase/server';
import { createCycle, createLevel, createClass } from './actions';

export default async function StructurePage() {
  const supabase = createClient();

  const [{ data: cycles }, { data: levels }, { data: years }, { data: classes }] = await Promise.all([
    supabase.from('cycles').select('id, name').order('display_order'),
    supabase.from('levels').select('id, name, cycle_id, cycles(name)').order('display_order'),
    supabase.from('academic_years').select('id, label, is_current').order('start_date', { ascending: false }),
    supabase.from('classes').select('id, name, capacity, levels(name), academic_years(label)').order('name')
  ]);

  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Structure pédagogique</h1>
          <div className="sub">Cycles, niveaux et classes — jamais codés en dur, toujours paramétrables</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Cycles</h2>
            <table className="data">
              <tbody>
                {cycles?.map((c) => <tr key={c.id}><td>{c.name}</td></tr>)}
                {!cycles?.length && <tr><td>Aucun cycle créé.</td></tr>}
              </tbody>
            </table>
            <form action={createCycle} className="form-grid full" style={{ marginTop: 14 }}>
              <div className="f-item">
                <label htmlFor="cycle_name">Nouveau cycle</label>
                <input id="cycle_name" name="name" placeholder="Primaire, Collège, Lycée..." required />
              </div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>

          <div className="panel">
            <h2>Niveaux</h2>
            <table className="data">
              <tbody>
                {levels?.map((l: any) => <tr key={l.id}><td>{l.name}</td><td>{l.cycles?.name}</td></tr>)}
                {!levels?.length && <tr><td>Aucun niveau créé.</td></tr>}
              </tbody>
            </table>
            <form action={createLevel} className="form-grid" style={{ marginTop: 14 }}>
              <div className="f-item">
                <label htmlFor="level_name">Nouveau niveau</label>
                <input id="level_name" name="name" placeholder="6e, Terminale..." required />
              </div>
              <div className="f-item">
                <label htmlFor="cycle_id">Cycle</label>
                <select id="cycle_id" name="cycle_id" required>
                  {cycles?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>
        </div>

        <div className="panel">
          <h2>Classes — {currentYear?.label ?? 'année non définie'}</h2>
          <table className="data">
            <tbody>
              {classes?.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.levels?.name}</td>
                  <td className="num">{c.capacity ?? '—'} places</td>
                  <td><a href={`/dashboard/structure/classe/${c.id}`}>Liste →</a></td>
                </tr>
              ))}
              {!classes?.length && <tr><td>Aucune classe créée pour cette année.</td></tr>}
            </tbody>
          </table>
          <form action={createClass} className="form-grid full" style={{ marginTop: 14 }}>
            <input type="hidden" name="academic_year_id" value={currentYear?.id ?? ''} />
            <div className="f-item">
              <label htmlFor="class_name">Nom de la classe</label>
              <input id="class_name" name="name" placeholder="6e A" required />
            </div>
            <div className="f-item">
              <label htmlFor="level_id">Niveau</label>
              <select id="level_id" name="level_id" required>
                {levels?.map((l: any) => <option key={l.id} value={l.id}>{l.name} ({l.cycles?.name})</option>)}
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="capacity">Capacité</label>
              <input id="capacity" name="capacity" type="number" min="1" placeholder="40" />
            </div>
            <button type="submit" className="btn ghost" disabled={!currentYear}>Ajouter</button>
            {!currentYear && <div className="hint">Créez d&apos;abord une année scolaire.</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
