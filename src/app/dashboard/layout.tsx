import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/login/actions';

const NAV = [
  { group: 'ADMINISTRATION', items: [
    { label: 'Établissement', href: '/dashboard/etablissement' },
    { label: 'Années scolaires', href: '/dashboard/annees-scolaires' },
    { label: 'Structure (cycles/niveaux/classes)', href: '/dashboard/structure' },
    { label: 'Élèves', href: '/dashboard/eleves' },
    { label: 'Inscriptions', href: '/dashboard/inscriptions/nouveau' }
  ]},
  { group: 'SCOLARITÉ', items: [
    { label: 'Frais', href: '/dashboard/frais' },
    { label: 'Paiements', href: '/dashboard/paiements' }
  ]},
  { group: 'FINANCES', items: [
    { label: 'Caisse', href: '/dashboard/caisse' },
    { label: 'Banques', href: '/dashboard/banques' },
    { label: 'Dépenses', href: '/dashboard/depenses' },
    { label: 'Fournisseurs', href: '/dashboard/fournisseurs' },
    { label: 'Budget', href: '/dashboard/budget' }
  ]},
  { group: 'COMPTABILITÉ', items: [
    { label: 'Plan comptable', href: '/dashboard/comptabilite/plan-comptable' },
    { label: 'Journaux', href: '/dashboard/comptabilite/journaux' },
    { label: 'Grand livre', href: '/dashboard/comptabilite/grand-livre' },
    { label: 'Balance', href: '/dashboard/comptabilite/balance' }
  ]},
  { group: 'PERSONNEL', items: [
    { label: 'Personnel', href: '/dashboard/personnel' },
    { label: 'Paie', href: '/dashboard/paie' }
  ]},
  { group: 'VIE SCOLAIRE', items: [
    { label: 'Absences', href: '/dashboard/vie-scolaire/absences' },
    { label: 'Retards', href: '/dashboard/vie-scolaire/retards' },
    { label: 'Discipline', href: '/dashboard/vie-scolaire/discipline' }
  ]},
  { group: 'PÉDAGOGIE', items: [
    { label: 'Matières', href: '/dashboard/pedagogie/matieres' },
    { label: 'Notes', href: '/dashboard/pedagogie/notes' },
    { label: 'Bulletins (moyennes)', href: '/dashboard/pedagogie/bulletins' },
    { label: 'Examens', href: '/dashboard/examens' }
  ]},
  { group: 'AUTRES', items: [
    { label: 'Stock', href: '/dashboard/stock' },
    { label: 'Cantine', href: '/dashboard/cantine' }
  ]}
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, background: 'var(--primary)', color: '#EDF3EF', padding: '22px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 22px', borderBottom: '1px solid rgba(255,255,255,.12)', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600 }}>
            {(profile as any)?.schools?.official_name ?? 'ERP Scolaire'}
          </div>
          <div style={{ fontSize: 11.5, color: '#B9CFC4', marginTop: 3 }}>
            {profile?.full_name ?? user?.email}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Link href="/dashboard" style={{ display: 'block', padding: '8px 20px', fontSize: 13, color: '#DCE8E2', textDecoration: 'none' }}>
            Tableau de bord
          </Link>
          {NAV.map((section) => (
            <div key={section.group}>
              <div style={{ padding: '14px 20px 4px', fontSize: 10.5, color: '#93B0A4' }}>{section.group}</div>
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} style={{ display: 'block', padding: '8px 20px', fontSize: 13, color: '#DCE8E2', textDecoration: 'none' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <form action={logout} style={{ padding: '0 20px' }}>
          <button type="submit" style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,.25)', color: '#EDF3EF',
            fontSize: 12.5, padding: '8px 12px', width: '100%', cursor: 'pointer'
          }}>
            Déconnexion
          </button>
        </form>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
