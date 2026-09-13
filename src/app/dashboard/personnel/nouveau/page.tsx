import { createPersonnel } from '../actions';

export default function NouveauPersonnelPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouveau membre du personnel</h1>
          <div className="sub">Fiche personnel — le compte utilisateur se crée ensuite séparément, si besoin</div>
        </div>
      </div>

      <form action={createPersonnel} className="panel" style={{ maxWidth: 640 }}>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="registration_number">Matricule</label>
            <input id="registration_number" name="registration_number" required />
          </div>
          <div className="f-item">
            <label htmlFor="gender">Sexe</label>
            <select id="gender" name="gender" required>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="last_name">Nom</label>
            <input id="last_name" name="last_name" required />
          </div>
          <div className="f-item">
            <label htmlFor="first_names">Prénoms</label>
            <input id="first_names" name="first_names" required />
          </div>
          <div className="f-item">
            <label htmlFor="role_function">Fonction</label>
            <input id="role_function" name="role_function" placeholder="Enseignant, comptable, gardien..." required />
          </div>
          <div className="f-item">
            <label htmlFor="category">Catégorie</label>
            <input id="category" name="category" />
          </div>
          <div className="f-item">
            <label htmlFor="hire_date">Date d&apos;embauche</label>
            <input id="hire_date" name="hire_date" type="date" />
          </div>
          <div className="f-item">
            <label htmlFor="contract_type">Type de contrat</label>
            <input id="contract_type" name="contract_type" />
          </div>
          <div className="f-item">
            <label htmlFor="base_salary">Salaire de base (FCFA)</label>
            <input id="base_salary" name="base_salary" type="number" min="0" required />
          </div>
          <div className="f-item">
            <label htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" />
          </div>
          <div className="f-item">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Créer la fiche
        </button>
      </form>
    </div>
  );
}
