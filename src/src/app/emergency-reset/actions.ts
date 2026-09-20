'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

function randomPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function resetDirecteurPin(formData: FormData) {
  const admin = createAdminClient();

  const school_code = String(formData.get('school_code')).toUpperCase();
  const identifier = String(formData.get('identifier'));

  const { data: school } = await admin.from('schools').select('id').eq('code', school_code).maybeSingle();
  if (!school) {
    redirect(`/emergency-reset?error=${encodeURIComponent('Code établissement introuvable.')}`);
  }

  // Résout l'identifiant (e-mail direct, ou code court -> e-mail technique)
  const email = identifier.includes('@') ? identifier : `${identifier.toLowerCase()}@login.internal`;

  const { data: authUser } = await admin.auth.admin.listUsers();
  const matchedUser = authUser.users.find((u) => u.email === email);
  if (!matchedUser) {
    redirect(`/emergency-reset?error=${encodeURIComponent('Identifiant introuvable.')}`);
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, school_id, user_roles(roles(name))')
    .eq('auth_user_id', matchedUser!.id)
    .eq('school_id', school!.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/emergency-reset?error=${encodeURIComponent('Ce compte n\'appartient pas à cet établissement.')}`);
  }

  const roleNames = (profile as any).user_roles?.map((ur: any) => ur.roles?.name) ?? [];
  if (!roleNames.includes('Directeur')) {
    redirect(`/emergency-reset?error=${encodeURIComponent('Cette réinitialisation d\'urgence est réservée au compte Directeur.')}`);
  }

  const pin = randomPin();
  const { error } = await admin.auth.admin.updateUserById(matchedUser!.id, { password: pin });
  if (error) {
    redirect(`/emergency-reset?error=${encodeURIComponent(`Échec : ${error.message}`)}`);
  }

  redirect(`/emergency-reset?pin=${pin}`);
}
