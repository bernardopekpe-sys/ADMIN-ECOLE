import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'pending' },
  soumise: { label: 'Soumise — attente Directeur', cls: 'pending' },
  validee: { label: 'Validée — à payer', cls: 'paid' },
  payee: { label: 'Payée', cls: 'paid' },
  comptabilisee: { label: 'Comptabilisée', cls: 'paid' },
  rejetee: { label: 'Rejetée', cls: 'late' },
  annulee: { label: 'Annulée', cls: 'late' }
};

export default async function DepensesPage() {
  const supabase = createClient();

  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, expense_number, expense_date, category, amount, status, suppliers(company_name)')
    .order('expense_date', { ascending: false })
    .limit(50);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dépenses</h1>
          <div className="sub">Toute dépense doit être validée par le Directeur avant paiement</div>
        </div>
        <Link href="/dashboard/depenses/nouveau" className="btn primary">Nouvelle dépense</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <a href="/api/exports/depenses" className="btn ghost">Exporter en CSV (Excel)</a>
      </div>

      <div className="panel">
        <table className="data">
          <thead><tr><th>N°</th><th>Date</th><th>Fournisseur / bénéficiaire</th><th>Catégorie</th><th className="num">Montant</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {expenses?.map((e: any) => {
              const badge = STATUS_BADGE[e.status] ?? { label: e.status, cls: 'pending' };
              return (
                <tr key={e.id}>
                  <td>{e.expense_number}</td>
                  <td>{e.expense_date}</td>
                  <td>{e.suppliers?.company_name ?? '—'}</td>
                  <td>{e.category}</td>
                  <td className="num">{Number(e.amount).toLocaleString('fr-FR')}</td>
                  <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                  <td><Link href={`/dashboard/depenses/${e.id}`}>Ouvrir →</Link></td>
                </tr>
              );
            })}
            {!expenses?.length && <tr><td colSpan={7}>Aucune dépense enregistrée.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
