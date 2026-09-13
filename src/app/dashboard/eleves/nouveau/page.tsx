import { createStudent } from '../actions';

export default function NouvelElevePage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Nouvel élève</h1>
          <div className="sub">Fiche élève — l&apos;inscription annuelle se fait séparément</div>
        </div>
      </div>

      <form action={createStudent} className="panel" style={{ maxWidth: 640 }}>
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
            <label htmlFor="birth_date">Date de naissance</label>
            <input id="birth_date" name="birth_date" type="date" />
          </div>
          <div className="f-item">
            <label htmlFor="birth_place">Lieu de naissance</label>
            <input id="birth_place" name="birth_place" />
          </div>
          <div className="f-item">
            <label htmlFor="nationality">Nationalité</label>
            <input id="nationality" name="nationality" defaultValue="Gabonaise" />
          </div>
          <div className="f-item">
            <label htmlFor="address">Adresse</label>
            <input id="address" name="address" />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Créer la fiche élève
        </button>
      </form>
    </div>
  );
}
