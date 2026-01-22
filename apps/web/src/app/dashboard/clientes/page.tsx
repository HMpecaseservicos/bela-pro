'use client';

import { useEffect, useState } from 'react';

interface Client {
  id: string;
  name: string;
  phoneE164: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  appointments: Array<{ id: string; startAt: string; status: string; service?: { name: string } }>;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [isMobile, setIsMobile] = useState(false);

  const API_URL = 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchClients();
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('cards');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function fetchClients() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const appointments = await res.json();
      
      const clientMap = new Map<string, Client>();
      appointments.forEach((apt: any) => {
        if (!apt.client) return;
        const existing = clientMap.get(apt.client.id);
        if (existing) {
          existing.appointments.push({ 
            id: apt.id, 
            startAt: apt.startAt, 
            status: apt.status,
            service: apt.service 
          });
        } else {
          clientMap.set(apt.client.id, {
            ...apt.client,
            notes: apt.client.notes || null,
            appointments: [{ id: apt.id, startAt: apt.startAt, status: apt.status, service: apt.service }],
          });
        }
      });
      
      setClients(Array.from(clientMap.values()));
    } catch {
      // Handle error
    }
    setLoading(false);
  }

  function openWhatsApp(phone: string, name: string) {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = '55' + cleanPhone;
    }
    const message = encodeURIComponent(`Olá ${name}! Tudo bem?`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  }

  function editClient(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phoneE164,
      email: client.email || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  }

  async function deleteClient(clientId: string, clientName: string) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${clientId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setClients(clients.filter(c => c.id !== clientId));
      } else {
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir cliente. Tente novamente.');
    }
  }

  async function saveClient() {
    if (!editingClient) return;
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: form.name,
          phoneE164: form.phone,
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      
      if (res.ok) {
        setClients(clients.map(c => 
          c.id === editingClient.id 
            ? { ...c, name: form.name, phoneE164: form.phone, email: form.email || null, notes: form.notes || null }
            : c
        ));
        setShowModal(false);
        setEditingClient(null);
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  }

  function formatPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 5)} ${clean.slice(5, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 3)} ${clean.slice(3, 7)}-${clean.slice(7)}`;
    }
    return phone;
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneE164.includes(search)
  );

  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.appointments.some(a => a.status === 'COMPLETED')).length;
  const newThisMonth = clients.filter(c => {
    const created = new Date(c.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'flex-start', 
        gap: isMobile ? 16 : 0,
        marginBottom: isMobile ? 20 : 32 
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 700, color: '#1a1a2e' }}>Clientes</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 14 : 15 }}>Gerencie sua base de clientes</p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '10px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                background: viewMode === 'table' ? '#667eea' : 'white',
                color: viewMode === 'table' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ☰ Lista
            </button>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                padding: '10px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 10,
                background: viewMode === 'cards' ? '#667eea' : 'white',
                color: viewMode === 'cards' ? 'white' : '#64748b',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              ▦ Cards
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: isMobile ? 12 : 16, 
        marginBottom: isMobile ? 20 : 32 
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? 16 : 24,
          color: 'white',
        }}>
          <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700 }}>{totalClients}</div>
          <div style={{ fontSize: isMobile ? 13 : 14, opacity: 0.9, marginTop: 4 }}>Total de Clientes</div>
        </div>
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? 16 : 24,
          border: '2px solid #e5e7eb',
        }}>
          <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700, color: '#10b981' }}>{activeClients}</div>
          <div style={{ fontSize: isMobile ? 13 : 14, color: '#64748b', marginTop: 4 }}>Clientes Ativos</div>
        </div>
        <div style={{
          background: 'white',
          borderRadius: isMobile ? 12 : 16,
          padding: isMobile ? 16 : 24,
          border: '2px solid #e5e7eb',
        }}>
          <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 700, color: '#f59e0b' }}>{newThisMonth}</div>
          <div style={{ fontSize: isMobile ? 13 : 14, color: '#64748b', marginTop: 4 }}>Novos este mês</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: isMobile ? 16 : 24, display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: isMobile ? '100%' : 400 }}>
          <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            style={{
              width: '100%',
              padding: '14px 20px 14px 48px',
              border: '2px solid #e5e7eb',
              borderRadius: 12,
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Clients List/Cards */}
      {filteredClients.length === 0 ? (
        <div style={{ 
          background: 'white', 
          borderRadius: 16, 
          padding: 60, 
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <svg style={{ width: 64, height: 64, color: '#d1d5db', margin: '0 auto 16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Nenhum cliente encontrado</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>Os clientes aparecerão aqui quando fizerem agendamentos</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 12 : 20 }}>
          {filteredClients.map(client => {
            const completed = client.appointments.filter(a => a.status === 'COMPLETED').length;
            const lastVisit = client.appointments
              .filter(a => a.status === 'COMPLETED')
              .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];

            return (
              <div key={client.id} style={{
                background: 'white',
                borderRadius: isMobile ? 12 : 16,
                padding: isMobile ? 16 : 24,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 20 }}>
                  <div style={{
                    width: isMobile ? 48 : 56,
                    height: isMobile ? 48 : 56,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: isMobile ? 12 : 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: isMobile ? 18 : 22,
                    flexShrink: 0,
                  }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1e293b' }}>{client.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: isMobile ? 13 : 14, color: '#64748b' }}>{formatPhone(client.phoneE164)}</p>
                    {client.email && <p style={{ margin: '2px 0 0', fontSize: isMobile ? 12 : 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.email}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 20 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#667eea' }}>{completed}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Visitas</div>
                  </div>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                      {lastVisit 
                        ? new Date(lastVisit.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        : '-'
                      }
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Última visita</div>
                  </div>
                </div>

                {client.notes && (
                  <div style={{ 
                    background: '#fffbeb', 
                    borderRadius: 8, 
                    padding: 12, 
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#92400e',
                  }}>
                    📝 {client.notes}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openWhatsApp(client.phoneE164, client.name)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px',
                      border: 'none',
                      borderRadius: 10,
                      background: '#25D366',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => editClient(client)}
                    style={{
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: 10,
                      background: 'white',
                      color: '#64748b',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => deleteClient(client.id, client.name)}
                    style={{
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: 10,
                      background: '#fee2e2',
                      color: '#dc2626',
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div style={{ 
          background: 'white', 
          borderRadius: 16, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: '1px solid #f1f5f9',
        }}>
          {/* Table Header */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 160px 100px 120px 160px',
            padding: '16px 24px',
            borderBottom: '2px solid #f1f5f9',
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            <div>Cliente</div>
            <div>Telefone</div>
            <div>Visitas</div>
            <div>Última Visita</div>
            <div>Ações</div>
          </div>

          {/* Table Rows */}
          {filteredClients.map((client, i) => {
            const completed = client.appointments.filter(a => a.status === 'COMPLETED').length;
            const lastVisit = client.appointments
              .filter(a => a.status === 'COMPLETED')
              .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0];

            return (
              <div 
                key={client.id}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 160px 100px 120px 160px',
                  padding: '16px 24px',
                  borderBottom: i < filteredClients.length - 1 ? '1px solid #f8fafc' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                    {client.email && <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.email}</div>}
                  </div>
                </div>

                <div style={{ color: '#64748b', fontSize: 14 }}>{formatPhone(client.phoneE164)}</div>

                <div>
                  <span style={{
                    background: completed >= 10 ? '#d1fae5' : completed >= 5 ? '#dbeafe' : completed > 0 ? '#fef3c7' : '#f1f5f9',
                    color: completed >= 10 ? '#059669' : completed >= 5 ? '#2563eb' : completed > 0 ? '#d97706' : '#64748b',
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {completed} {completed === 1 ? 'visita' : 'visitas'}
                  </span>
                </div>

                <div style={{ color: '#64748b', fontSize: 13 }}>
                  {lastVisit 
                    ? new Date(lastVisit.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-'
                  }
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => openWhatsApp(client.phoneE164, client.name)}
                    title="Enviar WhatsApp"
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: 8,
                      background: '#25D366',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => editClient(client)}
                    title="Editar cliente"
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #e5e7eb',
                      borderRadius: 8,
                      background: 'white',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteClient(client.id, client.name)}
                    title="Excluir cliente"
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: 8,
                      background: '#fee2e2',
                      color: '#dc2626',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editingClient && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 32,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: 24,
              }}>
                {editingClient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>Editar Cliente</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Atualize as informações do cliente</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@email.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Observações
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Preferências, alergias, notas importantes..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button
                onClick={() => { setShowModal(false); setEditingClient(null); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  background: 'white',
                  color: '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => openWhatsApp(form.phone, form.name)}
                style={{
                  padding: '14px 20px',
                  border: 'none',
                  borderRadius: 10,
                  background: '#25D366',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <button
                onClick={saveClient}
                disabled={saving || !form.name || !form.phone}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  borderRadius: 10,
                  background: form.name && form.phone ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                  color: form.name && form.phone ? 'white' : '#94a3b8',
                  fontWeight: 600,
                  cursor: form.name && form.phone ? 'pointer' : 'not-allowed',
                  fontSize: 15,
                }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
