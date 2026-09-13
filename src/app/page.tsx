import { redirect } from 'next/navigation';

// TODO V1 : vérifier la session Supabase ici et rediriger vers /login si absente.
export default function RootPage() {
  redirect('/dashboard');
}
