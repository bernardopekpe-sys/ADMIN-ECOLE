import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

const NAV = [
  { label: 'Tableau de bord', href: '/dashboard' },
  { label: 'Établissement', href: '/dashboard/etablissement' },
  { label: 'Années scolaires', href: '/dashboard/annees-scolaires' },
  { label: 'Structure', href: '/dashboard/structure' },
  { label: 'Élèves', href: '/dashboard/eleves' },
  { label: 'Inscriptions', href: '/dashboard/inscriptions/nouveau' },
  { label: 'Frais', href: '/dashboard/frais' },
  { label: 'Paiements', href: '/dashboard/paiements' },
  { label: 'Caisse', href: '/dashboard/caisse' },
  { label: 'Banques', href: '/dashboard/banques' },
  { label: 'Dépenses', href: '/dashboard/depenses' },
  { label: 'Fournisseurs', href: '/dashboard/fournisseurs' },
  { label: 'Budget', href: '/dashboard/budget' },
  { label: 'Plan comptable', href: '/dashboard/comptabilite/plan-comptable' },
  { label: 'Journaux', href: '/dashboard/comptabilite/journaux' },
  { label: 'Grand livre', href: '/dashboard/comptabilite/grand-livre' },
  { label: 'Balance', href: '/dashboard/comptabilite/balance' },
  { label: 'Personnel', href: '/dashboard/personnel' },
  { label: 'Paie', href: '/dashboard/paie' },
  { label: 'Absences', href: '/dashboard/vie-scolaire/absences' },
  { label: 'Retards', href: '/dashboard/vie-scolaire/retards' },
  { label: 'Discipline', href: '/dashboard/vie-scolaire/discipline' },
  { label: 'Matières', href: '/dashboard/pedagogie/matieres' },
  { label: 'Notes', href: '/dashboard/pedagogie/notes' },
  { label: 'Bulletins', href: '/dashboard/pedagogie/bulletins' },
  { label: 'Examens', href: '/dashboard/examens' },
  { label: 'Stock', href: '/dashboard/stock' },
  { label: 'Cantine', href: '/dashboard/cantine' }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, schools ( official_name )')
    .eq('auth_user_id', user?.id ?? '')
    .maybeSingle();

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
          display: 'flex', gap: 2, overflowX: 'auto', padding: '0 12px 8px',
          borderTop: '1px solid rgba(255,255,255,.12)'
        }}>
          {NAV.map((item) => (
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
