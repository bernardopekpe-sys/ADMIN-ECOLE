'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

function randomPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createSchoolWithDirector(formData: FormData) {
  const admin = createAdminClient();

  const official_name = String(formData.get('official_name'));
  const code = String(formData.get('code')).toUpperCase();
  const city = String(formData.get('city') ?? '') || null;
  const director_last_name = String(formData.get('director_last_name'));
  const director_first_names = String(formData.get('director_first_names'));

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({ official_name, code, city, currency: 'XAF', timezone: 'Africa/Libreville' })
    .select('id')
    .single();

  if (schoolError || !school) {
    redirect(`/platform/etablissements/nouveau?error=${encodeURIComponent(schoolError?.message ?? 'échec')}`);
  }

  await admin.rpc('initialize_default_roles', { p_school_id: school.id });
  await admin.rpc('initialize_default_accounting', { p_school_id: school.id });

  const { data: personnel, error: personnelError } = await admin
    .from('personnel')
    .insert({
      school_id: school.id, registration_number: 'DIR-0001',
      last_name: director_last_name, first_names: director_first_names,
      gender: 'M', role_function: 'directeur', base_salary: 0
    })
    .select('id')
    .single();

  if (personnelError || !personnel) {
    redirect(`/platform/etablissements/nouveau?error=${encodeURIComponent(personnelError?.message ?? 'échec fiche personnel')}`);
  }

  const loginCode = `${code}-DIR`;
  const pin = randomPin();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: `${loginCode.toLowerCase()}@login.internal`,
    password: pin,
    email_confirm: true
  });

  if (authError || !authUser.user) {
    redirect(`/platform/etablissements/nouveau?error=${encodeURIComponent(authError?.message ?? 'échec création compte')}`);
  }

  const { data: profile } = await admin
    .from('user_profiles')
    .insert({
      school_id: school.id, auth_user_id: authUser.user.id, personnel_id: personnel.id,
      full_name: `${director_last_name} ${director_first_names}`, login_code: loginCode
    })
    .select('id')
    .single();

  const { data: directorRole } = await admin
    .from('roles').select('id').eq('school_id', school.id).eq('name', 'Directeur').single();

  if (profile && directorRole) {
    await admin.from('user_roles').insert({ school_id: school.id, user_profile_id: profile.id, role_id: directorRole.id });
  }

  redirect(`/platform/etablissements/nouveau?done=1&code=${encodeURIComponent(loginCode)}&pin=${pin}`);
}
