   import { createSchoolWithDirector } from './actions';

export default function NouvelEtablissementPage({ searchParams }: { searchParams: { error?: string; done?: string; code?: string; pin?: string } }) {
  if (searchParams?.done === '1') {
    return (
      <div className="page">
        <div className="panel" style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Établissement créé</h1>
          <p className="hint" style={{ marginBottom: 14 }}>
            Transmets ces identifiants au Directeur — note-les, ils ne seront plus affichés :
          </p>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '12px 14px' }}>
            <div><strong>Code :</strong> {searchParams.code}</div>
            <div><strong>PIN :</strong> {searchParams.pin}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head"><div><h1>Nouvel établissement</h1></div></div>

      <form action={createSchoolWithDirector} className="panel" style={{ maxWidth: 520 }}>
        {searchParams?.error && <div className="error-box">{decodeURIComponent(searchParams.error)}</div>}

        <div className="form-grid">
          <div className="f-item"><label htmlFor="official_name">Nom officiel</label><input id="official_name" name="official_name" required /></div>
          <div className="f-item"><label htmlFor="code">Code établissement</label><input id="code" name="code" placeholder="CSM" required /></div>
          <div className="f-item"><label htmlFor="city">Ville</label><input id="city" name="city" /></div>
          <div className="f-item"><label htmlFor="director_last_name">Nom du Directeur</label><input id="director_last_name" name="director_last_name" required /></div>
          <div className="f-item"><label htmlFor="director_first_names">Prénoms du Directeur</label><input id="director_first_names" name="director_first_names" required /></div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 16 }}>Créer</button>
      </form>
    </div>
  );
}
