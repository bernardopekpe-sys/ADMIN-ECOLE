import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

const NAV: { label: string; href: string; module?: string }[] = [
  { label: 'Tableau de bord', href: '/dashboard' },
  { label: 'Établissement', href: '/dashboard/etablissement', module: 'etablissement' },
  { label: 'Années scolaires', href: '/dashboard/annees-scolaires', module: 'annees_scolaires' },
  { label: 'Structure', href: '/dashboard/structure', module: 'classes' },
  { label: 'Élèves', href: '/dashboard/eleves', module: 'eleves' },
  { label: 'Inscriptions', href: '/dashboard/inscriptions/nouveau', module: 'inscriptions' },
  { label: 'Frais', href: '/dashboard/frais', module: 'frais' },
  { label: 'Paiements', href: '/dashboard/paiements', module: 'paiements' },
  { label: 'Caisse', href: '/dashboard/caisse', module: 'caisse' },
  { label: 'Banques', href: '/dashboard/banques', module: 'banques' },
  { label: 'Dépenses', href: '/dashboard/depenses', module: 'depenses' },
  { label: 'Fournisseurs', href: '/dashboard/fournisseurs', module: 'fournisseurs' },
  { label: 'Budget', href: '/dashboard/budget', module: 'budget' },
  { label: 'Plan comptable', href: '/dashboard/comptabilite/plan-comptable', module: 'plan_comptable' },
  { label: 'Journaux', href: '/dashboard/comptabilite/journaux', module: 'journaux' },
  { label: 'Grand livre', href: '/dashboard/comptabilite/grand-livre', module: 'grand_livre' },
  { label: 'Balance', href: '/dashboard/comptabilite/balance', module: 'grand_livre' },
  { label: 'Personnel', href: '/dashboard/personnel', module: 'personnel' },
  { label: 'Paie', href: '/dashboard/paie', module: 'paie' },
  { label: 'Absences', href: '/dashboard/vie-scolaire/absences', module: 'absences_eleves' },
  { label: 'Retards', href: '/dashboard/vie-scolaire/retards', module: 'retards_eleves' },
  { label: 'Discipline', href: '/dashboard/vie-scolaire/discipline', module: 'discipline' },
  { label: 'Matières', href: '/dashboard/pedagogie/matieres', module: 'pedagogie' },
  { label: 'Notes', href: '/dashboard/pedagogie/notes', module: 'pedagogie' },
  { label: 'Bulletins', href: '/dashboard/pedagogie/bulletins', module: 'pedagogie' },
  { label: 'Examens', href: '/dashboard/examens', module: 'pedagogie' },
  { label: 'Stock', href: '/dashboard/stock', module: 'stock' },
  { label: 'Cantine', href: '/dashboard/cantine', module: 'cantine' }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, full_name, schools ( official_name )')
    .eq('auth_user_id', user?.id ?? '')
    .maybeSingle();

  // Récupère les modules autorisés pour le rôle de l'utilisateur connecté
  // (union de toutes les permissions "consulter" de ses rôles).
  let allowedModules = new Set<string>();
  if (profile?.id) {
    const { data: perms } = await supabase
      .from('user_roles')
      .select('roles(role_permissions(permissions(module, action)))')
      .eq('user_profile_id', profile.id);

    for (const ur of (perms ?? []) as any[]) {
      for (const rp of ur.roles?.role_permissions ?? []) {
        if (rp.permissions?.action === 'consulter') {
          allowedModules.add(rp.permissions.module);
        }
      }
    }
  }

  const visibleNav = NAV.filter((item) => !item.module || allowedModules.has(item.module));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--primary)', color: '#EDF3EF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600 }}>
              {(profile as any)?.schools?.official_name ?? 'ERP Scolaire'}
            </div>
            <div style={{ fontSize: 11, color: '#B9CFC4' }}>{profile?.full_name ?? user?.email}</div>
          </div>
          <form action={logout}>
            <button type="submit" style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,.3)', color: '#EDF3EF',
              fontSize: 12, padding: '6px 12px', cursor: 'pointer'
            }}>Déconnexion</button>
          </form>
        </div>
        <nav style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,.12)'
        }}>
          {visibleNav.map((item) => (
            <Link key={item.href} href={item.href} style={{
              whiteSpace: 'nowrap', padding: '8px 12px', fontSize: 12.5, color: '#DCE8E2',
              textDecoration: 'none', borderRadius: 3
            }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
