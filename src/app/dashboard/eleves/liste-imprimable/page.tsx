import { createClient } from '@/lib/supabase/server';
import ClassRoster from '@/components/ClassRoster';

export default async function ListeImprimablePage({
  searchParams
}: {
  searchParams: { cycle_id?: string; level_id?: string; class_id?: string };
}) {
  const supabase = createClient();

  const [{ data: years }, { data: cycles }, { data: levels }, { data: classes }] = await Promise.all([
    supabase.from('academic_years').select('id, is_current'),
    searchParams?.cycle_id ? supabase.from('cycles').select('name').eq('id', searchParams.cycle_id).single() : Promise.resolve({ data: null }),
    searchParams?.level_id ? supabase.from('levels').select('name').eq('id', searchParams.level_id).single() : Promise.resolve({ data: null }),
    searchParams?.class_id ? supabase.from('classes').select('name').eq('id', searchParams.class_id).single() : Promise.resolve({ data: null })
  ]);
  const currentYearId = years?.find((y) => y.is_current)?.id;

  let query = supabase
    .from('students')
    .select(`
      id, registration_number, last_name, first_names, gender, birth_date, birth_place, nationality, status,
      enrollments!inner ( class_id, academic_year_id, status, classes ( name, level_id, levels ( name, cycle_id ) ) )
    `)
    .eq('enrollments.status', 'inscrit')
    .order('last_name')
    .limit(1000);

  if (currentYearId) query = query.eq('enrollments.academic_year_id', currentYearId);
  if (searchParams?.class_id) query = query.eq('enrollments.class_id', searchParams.class_id);

  const { data: raw } = await query;

  const rows = (raw ?? []).filter((s: any) => {
    const enr = s.enrollments?.[0];
    if (!enr) return false;
    if (searchParams?.level_id && enr.classes?.level_id !== searchParams.level_id) return false;
    if (searchParams?.cycle_id && enr.classes?.levels?.cycle_id !== searchParams.cycle_id) return false;
    return true;
  });

  const studentIds = rows.map((s: any) => s.id);
  let financials: Record<string, { due: number; paid: number }> = {};
  if (studentIds.length) {
    const { data: fees } = await supabase
      .from('student_fees')
      .select('student_id, amount_due, student_fee_installments(amount_paid)')
      .in('student_id', studentIds);
    for (const f of fees ?? []) {
      const paid = (f.student_fee_installments ?? []).reduce((s: number, i: any) => s + Number(i.amount_paid), 0);
      if (!financials[f.student_id]) financials[f.student_id] = { due: 0, paid: 0 };
      financials[f.student_id].due += Number(f.amount_due);
      financials[f.student_id].paid += paid;
    }
  }

  const students = rows.map((s: any) => ({
    id: s.id,
    registration_number: s.registration_number,
    last_name: s.last_name,
    first_names: s.first_names,
    gender: s.gender,
    birth_date: s.birth_date,
    birth_place: s.birth_place,
    nationality: s.nationality,
    status: s.status,
    class_name: s.enrollments?.[0]?.classes?.name,
    due: financials[s.id]?.due ?? 0,
    paid: financials[s.id]?.paid ?? 0
  }));

  const scope = (classes as any)?.name ?? (levels as any)?.name ?? (cycles as any)?.name ?? 'Tout l\'établissement';
  const title = `${scope} — ${students.length} élève(s)`;

  return (
    <div className="page">
      <div className="page-head"><div><h1>Liste nominative</h1></div></div>
      <ClassRoster title={title} students={students} />
    </div>
  );
}
