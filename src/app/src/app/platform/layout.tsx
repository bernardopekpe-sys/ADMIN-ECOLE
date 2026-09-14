import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: isAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!isAdmin) redirect('/dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: '#1C2321', color: '#EDEDED', padding: '22px 0' }}>
        <div style={{ padding: '0 20px 20px', fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,.15)', marginBottom: 14 }}>
          Console Administrateur
        </div>
        <Link href="/platform/etablissements" style={{ display: 'block', padding: '8px 20px', color: '#DCDCDC', textDecoration: 'none', fontSize: 13 }}>
          Établissements
        </Link>
      </aside>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
