export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { bootstrapSchool } from './actions';

export default async function SetupPage({ searchParams }: { searchParams: { error?: string; done?: string } }) {
  const admin = createAdminClient();
  // Vérification volontairement large (bypass RLS via service_role) : ce
  // compte n'existant nulle part avant le tout premier établissement, il
  // n'y a pas encore de session pour appliquer current_school_id(). On
  // referme cette page dès qu'un établissement existe, pour ne jamais la
  // laisser exploitable en production.
  const { count } = await admin.from('schools').select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0 && searchParams?.done !== '1') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="panel" style={{ width: 420 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Configuration déjà effectuée</h1>
          <p className="hint">
            Un établissement existe déjà sur cette instance. Pour ajouter un nouvel
            établissement (déploiement multi-établissements distinct), utilisez
            ONBOARDING.md — cet assistant ne sert que pour le tout premier démarrage.
          </p>
          <a href="/login" className="btn primary" style={{ marginTop: 14, display: 'inline-block' }}>Aller à la connexion</a>
        </div>
      </div>
    );
  }

  if (searchParams?.done === '1') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="panel" style={{ width: 460 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Établissement créé</h1>
          <p className="hint">
            Un e-mail d&apos;invitation vient d&apos;être envoyé au Directeur pour qu&apos;il
            choisisse son mot de passe. Une fois cela fait, la connexion se fait normalement.
          </p>
          <a href="/login" className="btn primary" style={{ marginTop: 14, display: 'inline-block' }}>Aller à la connexion</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <form action={bootstrapSchool} className="panel" style={{ width: 460 }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Premier démarrage</h1>
        <div className="hint" style={{ marginBottom: 20 }}>
          Crée l&apos;établissement, le plan comptable, les rôles par défaut et le
          compte du premier Directeur — remplace les étapes manuelles décrites
          dans ONBOARDING.md.
        </div>

        {searchParams?.error && (
          <div className="error-box">{decodeURIComponent(searchParams.error)}</div>
        )}

        <h3>Établissement</h3>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="official_name">Nom officiel</label>
            <input id="official_name" name="official_name" required />
          </div>
          <div className="f-item">
            <label htmlFor="code">Code établissement</label>
            <input id="code" name="code" placeholder="CSM" required />
            <div className="hint">Utilisé dans la numérotation des reçus, dépenses, etc.</div>
          </div>
        </div>

        <h3>Premier compte Directeur</h3>
        <div className="form-grid">
          <div className="f-item">
            <label htmlFor="director_last_name">Nom</label>
            <input id="director_last_name" name="director_last_name" required />
          </div>
          <div className="f-item">
            <label htmlFor="director_first_names">Prénoms</label>
            <input id="director_first_names" name="director_first_names" required />
          </div>
          <div className="f-item">
            <label htmlFor="director_email">E-mail</label>
            <input id="director_email" name="director_email" type="email" required />
          </div>
        </div>

        <button type="submit" className="btn primary" style={{ marginTop: 18, width: '100%' }}>
          Créer l&apos;établissement
        </button>
      </form>
    </div>
  );
}
