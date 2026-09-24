'use client';

import { useState } from 'react';

type StudentRow = {
  id: string;
  registration_number: string;
  last_name: string;
  first_names: string;
  gender: string;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  status: string;
  class_name?: string;
  level_name?: string;
  due: number;
  paid: number;
};

const COLUMN_DEFS = [
  { key: 'birth_date', label: 'Date de naissance' },
  { key: 'birth_place', label: 'Lieu de naissance' },
  { key: 'nationality', label: 'Nationalité' },
  { key: 'gender', label: 'Sexe' },
  { key: 'status', label: 'Statut' },
  { key: 'class_name', label: 'Classe' },
  { key: 'financials', label: 'Situation financière (dû / payé / reste)' }
] as const;

export default function ClassRoster({ title, students }: { title: string; students: StudentRow[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  const showClass = students.some((s) => s.class_name);

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <h2>{title}</h2>
        <button type="button" className="btn ghost" onClick={() => window.print()}>Imprimer</button>
      </div>

      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginBottom: 16, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--line)' }}>
        {COLUMN_DEFS.filter((c) => c.key !== 'class_name' || showClass).map((col) => (
          <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={!!checked[col.key]} onChange={() => toggle(col.key)} />
            {col.label}
          </label>
        ))}
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>Matricule</th>
            <th>Nom</th>
            <th>Prénoms</th>
            {checked.gender && <th>Sexe</th>}
            {checked.birth_date && <th>Naissance</th>}
            {checked.birth_place && <th>Lieu de naissance</th>}
            {checked.nationality && <th>Nationalité</th>}
            {checked.status && <th>Statut</th>}
            {checked.class_name && showClass && <th>Classe</th>}
            {checked.financials && <th className="num">Dû</th>}
            {checked.financials && <th className="num">Payé</th>}
            {checked.financials && <th className="num">Reste</th>}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.registration_number}</td>
              <td>{s.last_name}</td>
              <td>{s.first_names}</td>
              {checked.gender && <td>{s.gender === 'M' ? 'Masculin' : 'Féminin'}</td>}
              {checked.birth_date && <td>{s.birth_date ?? '—'}</td>}
              {checked.birth_place && <td>{s.birth_place ?? '—'}</td>}
              {checked.nationality && <td>{s.nationality ?? '—'}</td>}
              {checked.status && <td>{s.status}</td>}
              {checked.class_name && showClass && <td>{s.class_name ?? '—'}</td>}
              {checked.financials && <td className="num">{s.due.toLocaleString('fr-FR')}</td>}
              {checked.financials && <td className="num">{s.paid.toLocaleString('fr-FR')}</td>}
              {checked.financials && <td className="num">{(s.due - s.paid).toLocaleString('fr-FR')}</td>}
            </tr>
          ))}
          {!students.length && <tr><td colSpan={10}>Aucun élève.</td></tr>}
        </tbody>
      </table>

      <style>{`
        @media print {
          .no-print, header, aside, nav { display: none !important; }
          .page-head a, .page-head button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
