import { resetDirecteurPin } from './actions';

export default function EmergencyResetPage({ searchParams }: { searchParams: { error?: string; pin?: string } }) {
  if (searchParams?.pin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="panel" style={{ width: 460 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Nouveau code d&apos;accès</h1>
          <p className="hint" style={{ marginBottom: 14 }}>
            Note ce PIN immédiatement — il ne sera plus jamais affiché :
          </p>
          <div style={{ background: 'var(--accent-soft)', border: '1px solid #E7C892', padding: '12px 14px', fontSize: 16 }}>
            <strong>{searchParams.pin}</strong>
          </div>
          <a href="/login" className="btn primary" style={{ marginTop: 14, display: 'inline-block' }}>Aller à la connexion</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <form action={resetDirecteurPin} className="panel" style={{ width: 420 }}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>Réinitialisation d&apos;urgence</h1>
        <div className="hint" style={{ marginBottom: 18 }}>
          Réservé au compte Directeur — nécessite le code de l&apos;établissement
          et l&apos;identifiant exact du compte.
        </div>

        {searchParams?.error && (
          <div className="error-box">{decodeURIComponent(searchParams.error)}</div>
        )}

        <div className="form-grid full">
          <div className="f-item">
            <label htmlFor="school_code">Code établissement</label>
            <input id="school_code" name="school_code" placeholder="03" required />
          </div>
          <div className="f-item">
            <label htmlFor="identifier">Identifiant du compte (e-mail ou code)</label>
            <input id="identifier" name="identifier" required />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ width: '100%', marginTop: 16 }}>
          Générer un nouveau code
        </button>
      </form>
    </div>
  );
}
