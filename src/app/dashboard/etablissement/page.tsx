import { createClient } from '@/lib/supabase/server';
import { updateSchool } from './actions';

export default async function EtablissementPage() {
  const supabase = createClient();

  // RLS restreint automatiquement à la seule ligne de l'établissement courant
  // (policy schools_select : id = current_school_id()).
  const { data: school } = await supabase.from('schools').select('*').single();

  if (!school) {
    return (
      <div className="page">
        <div className="error-box">
          Aucun établissement associé à ce compte. Voir ONBOARDING.md pour créer
          un établissement et rattacher un premier utilisateur Directeur.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Établissement</h1>
          <div className="sub">Identité et paramètres généraux</div>
        </div>
      </div>

      <form action={updateSchool} className="panel">
        <input type="hidden" name="id" value={school.id} />
        <h2>Informations générales</h2>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="official_name">Nom officiel</label>
            <input id="official_name" name="official_name" defaultValue={school.official_name} required />
          </div>
          <div className="f-item">
            <label htmlFor="short_name">Nom abrégé</label>
            <input id="short_name" name="short_name" defaultValue={school.short_name ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="code">Code établissement (numérotation)</label>
            <input id="code" name="code" defaultValue={school.code} required />
          </div>
          <div className="f-item">
            <label htmlFor="school_type">Type</label>
            <input id="school_type" name="school_type" defaultValue={school.school_type ?? ''} placeholder="Privé, public, confessionnel..." />
          </div>
        </div>

        <h3>Coordonnées</h3>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="phone">Téléphone</label>
            <input id="phone" name="phone" defaultValue={school.phone ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" defaultValue={school.email ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="city">Ville</label>
            <input id="city" name="city" defaultValue={school.city ?? ''} />
          </div>
          <div className="f-item">
            <label htmlFor="address">Adresse</label>
            <input id="address" name="address" defaultValue={school.address ?? ''} />
          </div>
        </div>

        <h3>Paramètres</h3>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="currency">Devise</label>
            <input id="currency" name="currency" defaultValue={school.currency} disabled />
          </div>
          <div className="f-item">
            <label htmlFor="timezone">Fuseau horaire</label>
            <input id="timezone" name="timezone" defaultValue={school.timezone} />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18 }}>
          Enregistrer
        </button>
      </form>
    </div>
  );
}
