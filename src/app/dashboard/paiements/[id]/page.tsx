import { createClient } from '@/lib/supabase/server';
import PrintButton from './print-button';

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
  const student = (payment as any).students;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Reçu {receipt?.receipt_number}</h1>
          <div className="sub">{student?.last_name} {student?.first_names}</div>
        </div>
        <PrintButton />
      </div>

      <div className="panel" style={{ maxWidth: 480 }} id="receipt-print-area">
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary)', paddingBottom: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{school?.official_name}</div>
            <div className="hint">{school?.city} {school?.po_box ? `— BP ${school.po_box}` : ''}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--primary)', fontWeight: 600 }}>
            {receipt?.receipt_number}
          </div>
        </div>

        <table className="data">
          <tbody>
            <tr><td>Élève</td><td>{student?.last_name} {student?.first_names}</td></tr>
            <tr><td>Payeur</td><td>{payment.payer_name ?? '—'}</td></tr>
            <tr><td>Mode</td><td>{payment.payment_method}</td></tr>
            <tr><td>Date</td><td>{payment.payment_date}</td></tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 8, borderTop: '1px solid var(--ink)', fontWeight: 600, fontSize: 15 }}>
          <span>Montant</span>
          <span>{Number(payment.amount).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="hint" style={{ marginTop: 8, fontStyle: 'italic' }}>{receipt?.amount_in_words}</div>
      </div>
    </div>
  );
}
