import { createClient } from '@/lib/supabase/server';
import PrintButton from './print-button';
import { cancelPayment } from '../actions';

export default async function RecuPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: payment } = await supabase
    .from('payments')
    .select(`
      *, students(last_name, first_names),
      receipts(receipt_number, amount_in_words),
      schools(official_name, city, po_box)
    `)
    .eq('id', params.id)
    .single();

  if (!payment) {
    return <div className="page"><div className="error-box">Paiement introuvable.</div></div>;
  }

  const receipt = (payment as any).receipts;
  const school = (payment as any).schools;

  // Ventilation complète : peut couvrir plusieurs élèves et plusieurs types
  // de frais en une seule fois — c'est payment_allocations, pas
  // payments.student_id, qui porte la vérité du détail.
  const { data: allocations } = await supabase
    .from('payment_allocations')
    .select(`
      amount_allocated,
      student_fee_installments (
        label,
        student_fees ( students(last_name, first_names), fee_assignments(fee_types(name)) )
      )
    `)
    .eq('payment_id', params.id);

  const byStudent: Record<string, { name: string; lines: { label: string; amount: number }[] }> = {};
  for (const a of (allocations ?? []) as any[]) {
    const sf = a.student_fee_installments?.student_fees;
    const key = sf?.students ? `${sf.students.last_name} ${sf.students.first_names}` : 'Élève';
    if (!byStudent[key]) byStudent[key] = { name: key, lines: [] };
    byStudent[key].lines.push({
      label: `${sf?.fee_assignments?.fee_types?.name ?? ''} — ${a.student_fee_installments?.label ?? ''}`,
      amount: Number(a.amount_allocated)
    });
  }
  const studentGroups = Object.values(byStudent);

  const { data: cancellation } = await supabase
    .from('payment_cancellations')
    .select('reason, created_at')
    .eq('payment_id', params.id)
    .maybeSingle();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Reçu {receipt?.receipt_number}</h1>
          <div className="sub">{studentGroups.map((g) => g.name).join(' · ')}</div>
        </div>
        <PrintButton />
      </div>

      {payment.status === 'cancelled' && (
        <div className="error-box">
          Paiement annulé{cancellation ? ` — motif : ${cancellation.reason}` : ''}
        </div>
      )}

      <div className="panel" style={{ maxWidth: 520 }} id="receipt-print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary)', paddingBottom: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{school?.official_name}</div>
            <div className="hint">{school?.city} {school?.po_box ? `— BP ${school.po_box}` : ''}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--primary)', fontWeight: 600 }}>
            {receipt?.receipt_number}
          </div>
        </div>

        <table className="data" style={{ marginBottom: 14 }}>
          <tbody>
            <tr><td>Payeur</td><td>{payment.payer_name ?? '—'}</td></tr>
            <tr><td>Mode</td><td>{payment.payment_method}</td></tr>
            <tr><td>Date</td><td>{payment.payment_date}</td></tr>
          </tbody>
        </table>

        {studentGroups.map((g, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{g.name}</div>
            <table className="data">
              <tbody>
                {g.lines.map((l, j) => (
                  <tr key={j}>
                    <td>{l.label}</td>
                    <td className="num">{l.amount.toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 8, borderTop: '1px solid var(--ink)', fontWeight: 600, fontSize: 15 }}>
          <span>Total</span>
          <span>{Number(payment.amount).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="hint" style={{ marginTop: 8, fontStyle: 'italic' }}>{receipt?.amount_in_words}</div>
      </div>

      {payment.status === 'validated' && (
        <div className="panel" style={{ maxWidth: 520, marginTop: 16 }}>
          <h2>Annuler ce paiement</h2>
          <div className="hint" style={{ marginBottom: 10 }}>
            Génère une écriture comptable inverse et retire les montants des échéanciers concernés.
            Le reçu original reste visible dans l&apos;historique, jamais supprimé.
          </div>
          <form action={cancelPayment}>
            <input type="hidden" name="payment_id" value={payment.id} />
            <div className="f-item" style={{ marginBottom: 10 }}>
              <label htmlFor="reason">Motif de l&apos;annulation</label>
              <input id="reason" name="reason" required />
            </div>
            <button type="submit" className="btn danger">Annuler le paiement</button>
          </form>
        </div>
      )}
    </div>
  );
}
