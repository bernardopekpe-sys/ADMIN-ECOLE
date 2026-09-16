'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function randomPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function createUserAccount(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id, code').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const personnel_id = String(formData.get('personnel_id'));
  const login_code = String(formData.get('login_code')).toUpperCase();
  const role_id = String(formData.get('role_id'));

  const { data: person } = await supabase.from('personnel').select('last_name, first_names').eq('id', personnel_id).single();
  if (!person) throw new Error('Fiche personnel introuvable.');

  const { data: existing } = await supabase.from('user_profiles').select('id').eq('personnel_id', personnel_id).maybeSingle();
  if (existing) throw new Error('Ce membre du personnel a déjà un compte utilisateur.');

  const admin = createAdminClient();
  const pin = randomPin();
  const fullLoginCode = `${school.code}-${login_code}`;

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: `${fullLoginCode.toLowerCase()}@login.internal`,
    password: pin,
    email_confirm: true
  });

  if (authError || !authUser.user) {
    throw new Error(`Impossible de créer le compte : ${authError?.message}`);
  }

  const { data: profile, error: profileError } = await supabase.from('user_profiles').insert({
    school_id: school.id,
    auth_user_id: authUser.user.id,
    personnel_id,
    full_name: `${person.last_name} ${person.first_names}`,
    login_code: fullLoginCode
  }).select('id').single();

  if (profileError) {
    throw new Error(`Compte Auth créé mais échec du profil : ${profileError.message}`);
  }

  const { error: roleError } = await supabase.from('user_roles').insert({
    school_id: school.id, user_profile_id: profile.id, role_id
  });
  if (roleError) {
    throw new Error(`Profil créé mais échec de l'attribution du rôle : ${roleError.message}`);
  }

  redirect(`/dashboard/personnel/${personnel_id}?code=${encodeURIComponent(fullLoginCode)}&pin=${pin}`);
}

export async function createAdvance(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const personnel_id = String(formData.get('personnel_id'));

  const { error } = await supabase.from('advances').insert({
    school_id: school.id,
    personnel_id,
    amount: Number(formData.get('amount')),
    reason: String(formData.get('reason') ?? '') || null,
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible de soumettre l'avance : ${error.message}`);
  revalidatePath(`/dashboard/personnel/${personnel_id}`);
}

export async function createLoan(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const personnel_id = String(formData.get('personnel_id'));

  const { error } = await supabase.from('personnel_loans').insert({
    school_id: school.id,
    personnel_id,
    principal_amount: Number(formData.get('principal_amount')),
    installment_count: Number(formData.get('installment_count')),
    monthly_installment: Number(formData.get('monthly_installment')),
    start_date: String(formData.get('start_date'))
  });

  if (error) throw new Error(`Impossible de créer le prêt : ${error.message}`);
  revalidatePath(`/dashboard/personnel/${personnel_id}`);
}

export async function createBonus(formData: FormData) {
  const supabase = createClient();
  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');
  const { data: auth } = await supabase.auth.getUser();

  const personnel_id = String(formData.get('personnel_id'));
  const label = String(formData.get('label'));

  let { data: element } = await supabase.from('salary_elements').select('id').eq('school_id', school.id).eq('name', label).maybeSingle();
  if (!element) {
    const { data: created, error: createError } = await supabase.from('salary_elements').insert({
      school_id: school.id, name: label, element_type: 'bonus'
    }).select('id').single();
    if (createError) throw new Error(`Impossible de créer le type de prime : ${createError.message}`);
    element = created;
  }

  const { error } = await supabase.from('bonuses').insert({
    school_id: school.id,
    personnel_id,
    salary_element_id: element.id,
    amount: Number(formData.get('bonus_amount')),
    period: String(formData.get('period')),
    created_by: auth.user?.id
  });

  if (error) throw new Error(`Impossible de soumettre la prime : ${error.message}`);
  revalidatePath(`/dashboard/personnel/${personnel_id}`);
}
