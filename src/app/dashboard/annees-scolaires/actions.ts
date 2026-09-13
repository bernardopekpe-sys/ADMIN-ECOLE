'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function createAcademicYear(formData: FormData) {
  const supabase = createClient();

  const label = String(formData.get('label'));
  const startDate = String(formData.get('start_date'));
  const endDate = String(formData.get('end_date'));
  const periodSystem = String(formData.get('period_system')) as 'trimestre' | 'palier';

  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  const { data: year, error } = await supabase
    .from('academic_years')
    .insert({
      school_id: school.id,
      label,
      start_date: startDate,
      end_date: endDate,
      period_system: periodSystem
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Impossible de créer l'année scolaire : ${error.message}`);
  }

  // Génère les study_periods réparties uniformément (voir addendum §1).
  // Le trigger check_period_number() côté base validera la cohérence
  // (1-3 pour trimestre, 1-6 pour palier) au moment de l'insertion.
  const periodCount = periodSystem === 'trimestre' ? 3 : 6;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const daysPerPeriod = Math.floor(totalDays / periodCount);

  const periods = Array.from({ length: periodCount }, (_, i) => {
    const periodStart = addDays(start, i * daysPerPeriod);
    const periodEnd = i === periodCount - 1 ? end : addDays(start, (i + 1) * daysPerPeriod - 1);
    return {
      school_id: school.id,
      academic_year_id: year.id,
      period_number: i + 1,
      label: periodSystem === 'trimestre' ? `Trimestre ${i + 1}` : `Palier ${i + 1}`,
      start_date: periodStart.toISOString().slice(0, 10),
      end_date: periodEnd.toISOString().slice(0, 10)
    };
  });

  const { error: periodsError } = await supabase.from('study_periods').insert(periods);
  if (periodsError) {
    throw new Error(`Année créée, mais échec de la génération des périodes : ${periodsError.message}`);
  }

  revalidatePath('/dashboard/annees-scolaires');
}

export async function setCurrentYear(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get('id'));

  const { data: school } = await supabase.from('schools').select('id').single();
  if (!school) throw new Error('Établissement introuvable pour ce compte.');

  // Une seule année courante à la fois : on désactive les autres d'abord.
  await supabase.from('academic_years').update({ is_current: false }).eq('school_id', school.id);
  const { error } = await supabase.from('academic_years').update({ is_current: true }).eq('id', id);

  if (error) {
    throw new Error(`Impossible de définir l'année courante : ${error.message}`);
  }

  revalidatePath('/dashboard/annees-scolaires');
}
