'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  const identifier = String(formData.get('identifier') ?? '');
  const password = String(formData.get('password') ?? '');
  const email = identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@login.internal`;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect('/login?error=1');
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
