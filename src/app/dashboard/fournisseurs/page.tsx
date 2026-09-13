import { createClient } from '@/lib/supabase/server';
import { createSupplier } from './actions';

export default async function FournisseursPage() {
  const supabase = createClient();

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, company_name, contact_name, phone, supplier_type, balance')
    .order('company_name');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Fournisseurs</h1>
          <div className="sub">{suppliers?.length ?? 0} fournisseur(s)</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Liste</h2>
          <table className="data">
            <thead><tr><th>Raison sociale</th><th>Contact</th><th>Téléphone</th><th>Type</th></tr></thead>
            <tbody>
              {suppliers?.map((s) => (
                <tr key={s.id}>
                  <td>{s.company_name}</td>
                  <td>{s.contact_name ?? '—'}</td>
                  <td>{s.phone ?? '—'}</td>
                  <td>{s.supplier_type ?? '—'}</td>
                </tr>
              ))}
              {!suppliers?.length && <tr><td colSpan={4}>Aucun fournisseur créé.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Nouveau fournisseur</h2>
          <form action={createSupplier} className="form-grid full">
            <div className="f-item">
              <label htmlFor="company_name">Raison sociale</label>
              <input id="company_name" name="company_name" required />
            </div>
            <div className="f-item">
              <label htmlFor="contact_name">Contact</label>
              <input id="contact_name" name="contact_name" />
            </div>
            <div className="f-item">
              <label htmlFor="phone">Téléphone</label>
              <input id="phone" name="phone" />
            </div>
            <div className="f-item">
              <label htmlFor="address">Adresse</label>
              <input id="address" name="address" />
            </div>
            <div className="f-item">
              <label htmlFor="supplier_type">Type</label>
              <input id="supplier_type" name="supplier_type" placeholder="Papeterie, entretien, restauration..." />
            </div>
            <button type="submit" className="btn primary">Créer</button>
          </form>
        </div>
      </div>
    </div>
  );
}
