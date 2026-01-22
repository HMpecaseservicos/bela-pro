export default function HomePage() {
  return (
    <main style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
      <header style={{ padding: '16px 0' }}>
        <h1 style={{ margin: 0 }}>BELA PRO</h1>
        <p style={{ marginTop: 8, color: '#555' }}>
          Sua agenda organizada, seu negócio no controle.
        </p>
      </header>

      <section
        style={{
          border: '1px solid #eee',
          borderRadius: 12,
          padding: 16,
          background: '#fff',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Próximos passos</h2>
        <ol style={{ paddingLeft: 18, color: '#333' }}>
          <li>Login do painel (admin)</li>
          <li>Link público de agendamento</li>
          <li>Integração WhatsApp</li>
        </ol>
      </section>
    </main>
  );
}
