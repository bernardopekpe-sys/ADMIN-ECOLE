/** Génère un CSV compatible Excel (séparateur point-virgule, BOM UTF-8) à partir de lignes d'objets. */
export function toCsv(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.map((h) => escape(h.label)).join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h.key])).join(';'))
  ];

  return '\uFEFF' + lines.join('\n');
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
