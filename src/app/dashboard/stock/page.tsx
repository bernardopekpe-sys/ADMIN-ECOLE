import { createClient } from '@/lib/supabase/server';
import { createCategory, createItem, recordMovement } from './actions';

export default async function StockPage() {
  const supabase = createClient();
  const { data: categories } = await supabase.from('stock_categories').select('id, name').order('name');
  const { data: items } = await supabase
    .from('stock_items')
    .select('id, name, unit, min_quantity, current_quantity, stock_categories(name)')
    .order('name');

  const alerts = items?.filter((i) => Number(i.current_quantity) <= Number(i.min_quantity)) ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Stock</h1><div className="sub">Articles, entrées, sorties, alertes</div></div>
      </div>

      {alerts.length > 0 && (
        <div className="error-box">
          Stock faible : {alerts.map((a) => a.name).join(', ')}
        </div>
      )}

      <div className="grid-2">
        <div>
          <div className="panel">
            <h2>Articles</h2>
            <table className="data">
              <thead><tr><th>Article</th><th>Catégorie</th><th className="num">Quantité</th><th className="num">Seuil min</th></tr></thead>
              <tbody>
                {items?.map((i: any) => (
                  <tr key={i.id} style={{ color: Number(i.current_quantity) <= Number(i.min_quantity) ? 'var(--danger)' : undefined }}>
                    <td>{i.name}</td><td>{i.stock_categories?.name ?? '—'}</td>
                    <td className="num">{i.current_quantity} {i.unit}</td>
                    <td className="num">{i.min_quantity}</td>
                  </tr>
                ))}
                {!items?.length && <tr><td colSpan={4}>Aucun article créé.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Catégories</h2>
            <form action={createCategory} className="form-grid">
              <div className="f-item"><label htmlFor="cat_name">Nouvelle catégorie</label><input id="cat_name" name="name" required /></div>
              <button type="submit" className="btn ghost">Ajouter</button>
            </form>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Nouvel article</h2>
            <form action={createItem} className="form-grid full">
              <div className="f-item"><label htmlFor="item_name">Nom</label><input id="item_name" name="name" required /></div>
              <div className="f-item"><label htmlFor="category_id">Catégorie</label>
                <select id="category_id" name="category_id" defaultValue="">
                  <option value="">—</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="f-item"><label htmlFor="unit">Unité</label><input id="unit" name="unit" defaultValue="unité" /></div>
              <div className="f-item"><label htmlFor="min_quantity">Seuil minimum</label><input id="min_quantity" name="min_quantity" type="number" defaultValue={0} /></div>
              <button type="submit" className="btn ghost">Créer</button>
            </form>
          </div>

          <div className="panel">
            <h2>Mouvement</h2>
            <form action={recordMovement} className="form-grid full">
              <div className="f-item"><label htmlFor="item_id">Article</label>
                <select id="item_id" name="item_id" required>
                  {items?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="f-item"><label htmlFor="movement_type">Type</label>
                <select id="movement_type" name="movement_type" defaultValue="in">
                  <option value="in">Entrée</option>
                  <option value="out">Sortie</option>
                </select>
              </div>
              <div className="f-item"><label htmlFor="quantity">Quantité</label><input id="quantity" name="quantity" type="number" min="0.01" step="0.01" required /></div>
              <div className="f-item"><label htmlFor="reason">Motif</label><input id="reason" name="reason" /></div>
              <button type="submit" className="btn primary">Enregistrer</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
