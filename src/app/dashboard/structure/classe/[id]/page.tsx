import { createClient } from '@/lib/supabase/server';
import ClassRoster from '@/components/ClassRoster';

export default async function ClasseRosterPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: classInfo } = await supabase
    .from('classes')
    .select('id, name, levels(name, cycles(name))')
    .eq('id', params.id)
    .single();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id, students(id, registration_number, last_name, first_names, gender, birth_date, birth_place, nationality, status)')
    .eq('class_id', params.id)
    .eq('status', 'inscrit');

  const studentIds = (enrollments ?? []).map((e: any) => e.student_id);

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

  const students = (enrollments ?? []).map((e: any) => ({
    id: e.students.id,
    registration_number: e.students.registration_number,
    last_name: e.students.last_name,
    first_names: e.students.first_names,
    gender: e.students.gender,
    birth_date: e.students.birth_date,
    birth_place: e.students.birth_place,
    nationality: e.students.nationality,
    status: e.students.status,
    due: financials[e.students.id]?.due ?? 0,
    paid: financials[e.students.id]?.paid ?? 0
  })).sort((a: any, b: any) => a.last_name.localeCompare(b.last_name));

  const title = `${(classInfo as any)?.name ?? 'Classe'} — ${(classInfo as any)?.levels?.cycles?.name ?? ''} / ${(classInfo as any)?.levels?.name ?? ''} — ${students.length} élève(s)`;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Liste nominative</h1>
        </div>
      </div>

      <ClassRoster title={title} students={students} />
    </div>
  );
}
