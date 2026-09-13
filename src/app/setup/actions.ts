'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

// Toutes les opérations passent par le client service_role : c'est le seul
// moment de toute l'application où ça se justifie, car aucune session
// utilisateur (donc aucun current_school_id()) n'existe encore pour
// satisfaire la RLS. Protégé par le contrôle "un seul établissement" fait
// dans setup/page.tsx — cette action réitère le même contrôle pour ne
// jamais dépendre uniquement de l'UI.
export async function bootstrapSchool(formData: FormData) {
  const admin = createAdminClient();

  const { count } = await admin.from('schools').select('*', { count: 'exact', head: true });
  if ((count ?? 0) > 0) {
    redirect(`/setup?error=${encodeURIComponent('Un établissement existe déjà — cet assistant ne sert que pour le tout premier démarrage.')}`);
  }

  const official_name = String(formData.get('official_name'));
  const code = String(formData.get('code')).toUpperCase();
  const director_last_name = String(formData.get('director_last_name'));
  const director_first_names = String(formData.get('director_first_names'));
  const director_email = String(formData.get('director_email'));

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({ official_name, code, currency: 'XAF', timezone: 'Africa/Libreville' })
    .select('id')
    .single();

  if (schoolError || !school) {
    redirect(`/setup?error=${encodeURIComponent(`Impossible de créer l'établissement : ${schoolError?.message}`)}`);
  }

  const { error: rolesError } = await admin.rpc('initialize_default_roles', { p_school_id: school.id });
  if (rolesError) {
    redirect(`/setup?error=${encodeURIComponent(`Établissement créé mais échec de l'initialisation des rôles : ${rolesError.message}`)}`);
  }

  const { error: accountingError } = await admin.rpc('initialize_default_accounting', { p_school_id: school.id });
  if (accountingError) {
    redirect(`/setup?error=${encodeURIComponent(`Rôles créés mais échec de l'initialisation comptable : ${accountingError.message}`)}`);
  }

  const { data: personnel, error: personnelError } = await admin
    .from('personnel')
    .insert({
      school_id: school.id,
      registration_number: 'DIR-0001',
      last_name: director_last_name,
      first_names: director_first_names,
      gender: 'M',
      role_function: 'directeur',
      base_salary: 0,
      email: director_email
    })
    .select('id')
    .single();

  if (personnelError || !personnel) {
    redirect(`/setup?error=${encodeURIComponent(`Échec de la fiche personnel du Directeur : ${personnelError?.message}`)}`);
  }

  const { data: authUser, error: authError } = await admin.auth.admin.inviteUserByEmail(director_email);
  if (authError || !authUser.user) {
    redirect(`/setup?error=${encodeURIComponent(`Échec de l'invitation par e-mail : ${authError?.message}`)}`);
  }

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .insert({
      school_id: school.id,
      auth_user_id: authUser.user.id,
      personnel_id: personnel.id,
      full_name: `${director_last_name} ${director_first_names}`
    })
    .select('id')
    .single();

  if (profileError || !profile) {
    redirect(`/setup?error=${encodeURIComponent(`Compte invité mais échec du profil : ${profileError?.message}`)}`);
  }

  const { data: directorRole } = await admin
    .from('roles')
    .select('id')
    .eq('school_id', school.id)
    .eq('name', 'Directeur')
    .single();

  const { error: userRoleError } = await admin
    .from('user_roles')
    .insert({ school_id: school.id, user_profile_id: profile.id, role_id: directorRole?.id });

  if (userRoleError) {
    redirect(`/setup?error=${encodeURIComponent(`Profil créé mais échec de l'attribution du rôle Directeur : ${userRoleError.message}`)}`);
  }

  redirect('/setup?done=1');
}
