import { createClient } from '@/lib/supabase/server';

export default async function JournauxPage() {
  const supabase = createClient();

  const { data: journals } = await supabase.from('accounting_journals').select('id, code, name').order('code');

  const { data: entries } = await supabase
    .from('accounting_entries')
    .select('id, entry_number, entry_date, description, status, accounting_journals(code)')
    .order('entry_date', { ascending: false })
    .limit(30);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Journaux</h1>
          <div className="sub">Écritures générées automatiquement par les paiements, dépenses et la paie</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Journaux configurés</h2>
          <table className="data">
            <tbody>
              {journals?.map((j) => <tr key={j.id}><td>{j.code}</td><td>{j.name}</td></tr>)}
              {!journals?.length && <tr><td colSpan={2}>Aucun journal — exécuter initialize_default_accounting().</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Dernières écritures</h2>
          <table className="data">
            <thead><tr><th>N°</th><th>Date</th><th>Journal</th><th>Libellé</th><th>Statut</th></tr></thead>
            <tbody>
              {entries?.map((e: any) => (
                <tr key={e.id}>
                  <td>{e.entry_number}</td>
                  <td>{e.entry_date}</td>
                  <td>{e.accounting_journals?.code}</td>
                  <td>{e.description}</td>
                  <td>{e.status}</td>
                </tr>
              ))}
              {!entries?.length && <tr><td colSpan={5}>Aucune écriture pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
