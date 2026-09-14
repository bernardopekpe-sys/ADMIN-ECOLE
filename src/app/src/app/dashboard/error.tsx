'use client';

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 30 }}>
      <div className="error-box">
        <strong>Erreur — détail technique</strong>
        <div>{error.message}</div>
        <div style={{ fontSize: 11, marginTop: 6 }}>Digest : {error.digest}</div>
      </div>
    </div>
  );
}
