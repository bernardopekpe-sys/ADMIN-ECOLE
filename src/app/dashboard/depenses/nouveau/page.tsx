import { createClient } from '@/lib/supabase/server';
import { createExpense } from '../actions';

export default async function NouvelleDepensePage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase.from('suppliers').select('id, company_name').order('company_name');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouvelle dépense</h1>
          <div className="sub">Créée en brouillon — à soumettre ensuite pour validation</div>
        </div>
      </div>

      <form action={createExpense} className="panel" style={{ maxWidth: 640 }}>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="supplier_id">Fournisseur (optionnel)</label>
            <select id="supplier_id" name="supplier_id" defaultValue="">
              <option value="">— Bénéficiaire non enregistré —</option>
              {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="beneficiary_name">Nom du bénéficiaire (si non enregistré)</label>
            <input id="beneficiary_name" name="beneficiary_name" />
          </div>
          <div className="f-item">
            <label htmlFor="category">Catégorie</label>
            <input id="category" name="category" placeholder="Fournitures, entretien, eau/électricité..." required />
          </div>
          <div className="f-item">
            <label htmlFor="amount">Montant (FCFA)</label>
            <input id="amount" name="amount" type="number" min="1" required />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Créer en brouillon
        </button>
      </form>
    </div>
  );
}
