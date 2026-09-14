'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ padding: 40, fontFamily: 'monospace', background: '#fff', color: '#111' }}>
        <h1 style={{ fontSize: 18 }}>Erreur — détail technique</h1>
        <p><strong>Message :</strong> {error.message}</p>
        <p><strong>Digest :</strong> {error.digest}</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f5f5f5', padding: 12 }}>{error.stack}</pre>
      </body>
    </html>
  );
}
