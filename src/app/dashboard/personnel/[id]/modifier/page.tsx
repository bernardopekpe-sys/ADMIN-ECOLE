import { createClient } from '@/lib/supabase/server';
import { updatePersonnel, toggleActive } from './actions';

export default async function ModifierPersonnelPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: person } = await supabase.from('personnel').select('*').eq('id', params.id).single();

  if (!person) return <div className="page"><div className="error-box">Fiche personnel introuvable.</div></div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Modifier — {person.last_name} {person.first_names}</h1>
          <div className="sub">Fiche personnel</div>
        </div>
        <form action={toggleActive}>
          <input type="hidden" name="personnel_id" value={person.id} />
          <input type="hidden" name="new_status" value={person.status === 'active' ? 'inactive' : 'active'} />
          <button type="submit" className={person.status === 'active' ? 'btn ghost' : 'btn primary'}>
            {person.status === 'active' ? 'Désactiver ce membre' : 'Réactiver ce membre'}
          </button>
        </form>
      </div>

      <form action={updatePersonnel} className="panel" style={{ maxWidth: 640 }}>
        <input type="hidden" name="personnel_id" value={person.id} />
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="registration_number">Matricule</label>
            <input id="registration_number" name="registration_number" defaultValue={person.registration_number} required />
          </div>
          <div className="f-item">
            <label htmlFor="gender">Sexe</label>
            <select id="gender" name="gender" defaultValue={person.gender} required>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div className="f-item">
            <label htmlFor="last_name">Nom</label>
            <input id="last_name" name="last_name" defaultValue={person.last_name} required />
          </div>
          <div className="f-item">
            <label htmlFor="first_names">Prénoms</label>
            <input id="first_names" name="first_names" defaultValue={person.first_names} required />
          </div>
          <div className="f-item">
            <label htmlFor="role_function">Fonction</label>
            <input id="role_function" name="role_function" defaultValue={person.role_function} required />
          </div>
          <div className="f-item">
            <label htmlFor="category">Catégorie</label>
            <input id="category" name="category" defaultValue={person.category ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="hire_date">Date d&apos;embauche</label>
            <input id="hire_date" name="hire_date" type="date" defaultValue={person.hire_date ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="contract_type">Type de contrat</label>
            <input id="contract_type" name="contract_type" defaultValue={person.contract_type ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" defaultValue={person.phone ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" defaultValue={person.email ?? ''} />
          </div>
        </div>

        <div className="hint" style={{ marginTop: 12 }}>
          Le salaire de base ne se modifie pas ici — pour préserver l&apos;historique,
          tout changement de salaire passe par une nouvelle ligne dans
          l&apos;historique des salaires, depuis la fiche du personnel.
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Enregistrer les modifications
        </button>
      </form>
    </div>
  );
}
