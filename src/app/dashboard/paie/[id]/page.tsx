import { createClient } from '@/lib/supabase/server';
import { generateForAllPersonnel, validatePeriod, payPayroll, proposeDeductions, approveDeduction } from '../actions';

export default async function PeriodePaiePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: period } = await supabase.from('payroll_periods').select('*').eq('id', params.id).single();
  const { data: payrolls } = await supabase
    .from('payrolls')
    .select('id, base_salary, gross_total, deduction_total, net_pay, status, personnel(last_name, first_names)')
    .eq('payroll_period_id', params.id);
  const { data: cashSessions } = await supabase.from('cash_sessions').select('id, cash_registers(name)').eq('status', 'ouverte');
  const { data: bankAccounts } = await supabase.from('bank_accounts').select('id, account_name, bank_name');

  const payrollIds = (payrolls ?? []).map((p) => p.id);
  const { data: pendingDeductions } = payrollIds.length
    ? await supabase
        .from('payroll_deductions')
        .select('id, justification, approved_by, payroll_items!inner(label, amount, payroll_id)')
        .is('approved_by', null)
        .in('payroll_items.payroll_id', payrollIds)
    : { data: [] as any[] };

  if (!period) return <div className="page"><div className="error-box">Période introuvable.</div></div>;

  const totalNet = payrolls?.reduce((s, p) => s + Number(p.net_pay), 0) ?? 0;
  const totalGross = payrolls?.reduce((s, p) => s + Number(p.gross_total), 0) ?? 0;
  const personnelNames = new Map((payrolls ?? []).map((p: any) => [p.id, `${p.personnel?.last_name} ${p.personnel?.first_names}`]));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Paie — {period.label}</h1>
          <div className="sub">Statut : {period.status}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {period.status === 'preparation' && (
            <>
              <form action={generateForAllPersonnel}>
                <input type="hidden" name="period_id" value={period.id} />
                <button type="submit" className="btn ghost">Générer pour tout le personnel actif</button>
              </form>
              <form action={proposeDeductions}>
                <input type="hidden" name="period_id" value={period.id} />
                <button type="submit" className="btn ghost">Proposer les retenues absences</button>
              </form>
              <form action={validatePeriod}>
                <input type="hidden" name="period_id" value={period.id} />
                <button type="submit" className="btn primary">Valider la période</button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi"><div className="label">Salariés</div><div className="value">{payrolls?.length ?? 0}</div></div>
        <div className="kpi"><div className="label">Total brut</div><div className="value">{totalGross.toLocaleString('fr-FR')}</div></div>
        <div className="kpi"><div className="label">Total net à payer</div><div className="value">{totalNet.toLocaleString('fr-FR')}</div></div>
      </div>

      {!!pendingDeductions?.length && (
        <div className="panel">
          <h2>Retenues proposées — en attente de validation</h2>
          <table className="data">
            <thead><tr><th>Personnel</th><th>Motif</th><th className="num">Montant</th><th></th></tr></thead>
            <tbody>
              {pendingDeductions.map((d: any) => (
                <tr key={d.id}>
                  <td>{personnelNames.get(d.payroll_items?.payroll_id)}</td>
                  <td>{d.justification}</td>
                  <td className="num">{Number(d.payroll_items?.amount).toLocaleString('fr-FR')}</td>
                  <td>
                    <form action={approveDeduction}>
                      <input type="hidden" name="deduction_id" value={d.id} />
                      <button type="submit" className="btn ghost">Valider cette retenue</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hint">
            Tant qu&apos;une retenue n&apos;est pas validée ici, elle n&apos;est pas incluse dans le net à payer —
            conformément à la règle métier (aucune retenue automatique définitive).
          </div>
        </div>
      )}

      <div className="panel">
        <table className="data">
          <thead><tr><th>Personnel</th><th className="num">Brut</th><th className="num">Retenues</th><th className="num">Net</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {payrolls?.map((p: any) => (
              <tr key={p.id}>
                <td>{p.personnel?.last_name} {p.personnel?.first_names}</td>
                <td className="num">{Number(p.gross_total).toLocaleString('fr-FR')}</td>
                <td className="num">{Number(p.deduction_total).toLocaleString('fr-FR')}</td>
                <td className="num">{Number(p.net_pay).toLocaleString('fr-FR')}</td>
                <td><span className="badge paid">{p.status}</span></td>
                <td>
                  {p.status === 'validated' && (
                    <form action={payPayroll} style={{ display: 'flex', gap: 6 }}>
                      <input type="hidden" name="payroll_id" value={p.id} />
                      <select name="cash_session_id" style={{ fontSize: 12 }}>
                        <option value="">Caisse…</option>
                        {cashSessions?.map((s: any) => <option key={s.id} value={s.id}>{s.cash_registers?.name}</option>)}
                      </select>
                      <select name="bank_account_id" style={{ fontSize: 12 }}>
                        <option value="">Banque…</option>
                        {bankAccounts?.map((b) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                      </select>
                      <button type="submit" className="btn ghost">Payer</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!payrolls?.length && <tr><td colSpan={6}>Aucun bulletin généré pour cette période.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
