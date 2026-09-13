import { createClient } from '@/lib/supabase/server';
import { createBudgetLine } from './actions';

export default async function BudgetPage() {
  const supabase = createClient();

  const { data: years } = await supabase.from('academic_years').select('id, label, is_current, start_date, end_date').order('start_date', { ascending: false });
  const currentYear = years?.find((y) => y.is_current) ?? years?.[0];

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, line_type, category, forecast_amount')
    .eq('academic_year_id', currentYear?.id ?? '')
    .order('line_type');

  // Réalisé — dépenses : agrégé côté application (pas de vue SQL dédiée en V1, cf. README).
  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount, status')
    .in('status', ['payee', 'comptabilisee']);

  const realizedExpenseByCategory = new Map<string, number>();
  for (const e of expenses ?? []) {
    realizedExpenseByCategory.set(e.category, (realizedExpenseByCategory.get(e.category) ?? 0) + Number(e.amount));
  }

  // Réalisé — recettes : ventilation des paiements jusqu'au type de frais.
  const { data: allocations } = await supabase
    .from('payment_allocations')
    .select('amount_allocated, student_fee_installments(student_fees(fee_assignments(fee_types(name))))');

  const realizedRevenueByCategory = new Map<string, number>();
  for (const a of (allocations ?? []) as any[]) {
    const name = a.student_fee_installments?.student_fees?.fee_assignments?.fee_types?.name;
    if (name) realizedRevenueByCategory.set(name, (realizedRevenueByCategory.get(name) ?? 0) + Number(a.amount_allocated));
  }

  const rows = (budgets ?? []).map((b) => {
    const realized = b.line_type === 'expense'
      ? (realizedExpenseByCategory.get(b.category) ?? 0)
      : (realizedRevenueByCategory.get(b.category) ?? 0);
    return { ...b, realized, gap: Number(b.forecast_amount) - realized };
  });

  const revenueRows = rows.filter((r) => r.line_type === 'revenue');
  const expenseRows = rows.filter((r) => r.line_type === 'expense');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Budget — {currentYear?.label}</h1>
          <div className="sub">Prévisionnel / Réalisé / Écart</div>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Recettes</h2>
            <BudgetTable rows={revenueRows} />
          </div>
          <div className="panel">
            <h2>Dépenses</h2>
            <BudgetTable rows={expenseRows} />
          </div>
        </div>

        <div className="panel">
          <h2>Ajouter une ligne budgétaire</h2>
          <form action={createBudgetLine} className="form-grid full">
            <input type="hidden" name="academic_year_id" value={currentYear?.id ?? ''} />
            <div className="f-item">
              <label htmlFor="line_type">Type</label>
              <select id="line_type" name="line_type" defaultValue="revenue">
                <option value="revenue">Recette</option>
                <option value="expense">Dépense</option>
              </select>
            </div>
            <div className="f-item">
              <label htmlFor="category">Catégorie</label>
              <input id="category" name="category" placeholder="Doit correspondre au nom du type de frais (recette) ou à la catégorie de dépense" required />
            </div>
            <div className="f-item">
              <label htmlFor="forecast_amount">Montant prévisionnel (FCFA)</label>
              <input id="forecast_amount" name="forecast_amount" type="number" min="0" required />
            </div>
            <button type="submit" className="btn ghost" disabled={!currentYear}>Ajouter</button>
          </form>
          <div className="hint">
            Le réalisé est calculé automatiquement : pour une recette, à partir des
            paiements ventilés sur le type de frais du même nom ; pour une dépense,
            à partir des dépenses payées portant la même catégorie.
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetTable({ rows }: { rows: { id: string; category: string; forecast_amount: number; realized: number; gap: number }[] }) {
  const totalForecast = rows.reduce((s, r) => s + Number(r.forecast_amount), 0);
  const totalRealized = rows.reduce((s, r) => s + r.realized, 0);
  return (
    <table className="data">
      <thead><tr><th>Poste</th><th className="num">Prévisionnel</th><th className="num">Réalisé</th><th className="num">Écart</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.category}</td>
            <td className="num">{Number(r.forecast_amount).toLocaleString('fr-FR')}</td>
            <td className="num">{r.realized.toLocaleString('fr-FR')}</td>
            <td className="num" style={{ color: r.gap < 0 ? 'var(--danger)' : undefined }}>{r.gap.toLocaleString('fr-FR')}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={4}>Aucune ligne budgétaire.</td></tr>}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr style={{ fontWeight: 600 }}>
            <td>Total</td>
            <td className="num">{totalForecast.toLocaleString('fr-FR')}</td>
            <td className="num">{totalRealized.toLocaleString('fr-FR')}</td>
            <td className="num">{(totalForecast - totalRealized).toLocaleString('fr-FR')}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
