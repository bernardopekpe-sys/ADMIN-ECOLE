import { createClient } from '@/lib/supabase/server';

// Branché sur les vues posées dans 0009_vues_tableau_de_bord.sql (workflow n°30).
export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: studentCount }, { data: treasury }, { data: unpaid }, { data: results }] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('v_treasury_summary').select('total_treasury').maybeSingle(),
    supabase.from('v_unpaid_installments').select('unpaid_count, unpaid_total').maybeSingle(),
    supabase.from('v_monthly_result')
      .select('month, recettes, depenses')
      .order('month', { ascending: false })
      .limit(1)
  ]);

  const currentMonth = results?.[0];
  const resultat = currentMonth ? Number(currentMonth.recettes) - Number(currentMonth.depenses) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Vue d&apos;ensemble</h1>
          <div className="sub">Tableau de bord Directeur</div>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="Élèves inscrits" value={studentCount ?? '—'} />
        <Kpi label="Trésorerie disponible" value={`${Number(treasury?.total_treasury ?? 0).toLocaleString('fr-FR')} FCFA`} hint="Caisses + banques" />
        <Kpi label="Impayés" value={`${Number(unpaid?.unpaid_total ?? 0).toLocaleString('fr-FR')} FCFA`} hint={`${unpaid?.unpaid_count ?? 0} tranche(s)`} />
        <Kpi label="Résultat du mois" value={`${resultat.toLocaleString('fr-FR')} FCFA`} hint={currentMonth ? new Date(currentMonth.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Aucune écriture ce mois'} />
      </div>

      <div className="panel">
        <h2>Rappel — résultat ≠ trésorerie</h2>
        <p className="hint">
          Le résultat du mois vient des écritures comptables validées (recettes classe 7
          moins dépenses classe 6). La trésorerie disponible vient des soldes réels de
          caisse et de banque. Une recette facturée mais non encaissée (un impayé) compte
          dans les échéanciers, jamais dans la trésorerie — c&apos;est la distinction posée
          au §52 du document d&apos;architecture.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
