'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

export async function bootstrapSchool(formData: FormData) {
  // Diagnostic : on vérifie d'abord que les variables d'environnement sont
  // bien reçues côté serveur, avant même de tenter quoi que ce soit.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    redirect(`/setup?error=${encodeURIComponent(
      `DIAGNOSTIC — NEXT_PUBLIC_SUPABASE_URL est ${url ? 'présente (longueur ' + url.length + ')' : 'ABSENTE'}, SUPABASE_SERVICE_ROLE_KEY est ${serviceKey ? 'présente (longueur ' + serviceKey.length + ')' : 'ABSENTE'}.`
    )}`);
  }

  const admin = createAdminClient();

  try {
    const { count, error: countError } = await admin.from('schools').select('*', { count: 'exact', head: true });
    if (countError) {
      redirect(`/setup?error=${encodeURIComponent(`DIAGNOSTIC — Échec du comptage schools : ${countError.message} (code: ${(countError as any).code ?? 'n/a'})`)}`);
    }
    if ((count ?? 0) > 0) {
      redirect(`/setup?error=${encodeURIComponent('Un établissement existe déjà — cet assistant ne sert que pour le tout premier démarrage.')}`);
    }
  } catch (e: any) {
    redirect(`/setup?error=${encodeURIComponent(`DIAGNOSTIC — Exception au comptage : ${e?.message ?? String(e)}`)}`);
  }

  const official_name = String(formData.get('official_name'));
  const code = String(formData.get('code')).toUpperCase();
  const director_last_name = String(formData.get('director_last_name'));
  const director_first_names = String(formData.get('director_first_names'));
  const director_email = String(formData.get('director_email'));

  let school: { id: string } | null = null;
  try {
    const { data, error: schoolError } = await admin
      .from('schools')
      .insert({ official_name, code, currency: 'XAF', timezone: 'Africa/Libreville' })
      .select('id')
      .single();

    if (schoolError || !data) {
      redirect(`/setup?error=${encodeURIComponent(`DIAGNOSTIC — Échec insertion schools : ${schoolError?.message} (code: ${(schoolError as any)?.code ?? 'n/a'})`)}`);
    }
    school = data;
  } catch (e: any) {
    redirect(`/setup?error=${encodeURIComponent(`DIAGNOSTIC — Exception à l'insertion schools : ${e?.message ?? String(e)}`)}`);
  }

  if (!school) {
    redirect(`/setup?error=${encodeURIComponent('DIAGNOSTIC — school est null après insertion, sans erreur explicite.')}`);
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
