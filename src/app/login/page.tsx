import { login } from './actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)'
    }}>
      <form action={login} className="panel" style={{ width: 360 }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>ERP Scolaire</h1>
        <div className="hint" style={{ marginBottom: 20 }}>Connexion à votre établissement</div>

        {searchParams?.error && (
          <div className="error-box">Identifiants incorrects. Veuillez réessayer.</div>
        )}

        <div className="form-grid full">
          <div className="f-item">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="f-item">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ width: '100%', marginTop: 18 }}>
          Se connecter
        </button>

        <div className="hint" style={{ marginTop: 16, textAlign: 'center' }}>
          Premier démarrage ? <a href="/setup">Configurer votre établissement</a>
        </div>
      </form>
    </div>
  );
}
