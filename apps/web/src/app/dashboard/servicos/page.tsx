'use client';

import { useEffect, useState, useRef } from 'react';
import { getImageUrl } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
  imageUrl: string | null;
  badgeText: string | null;
  categoryTag: string | null;
}

const defaultForm = {
  name: '',
  description: '',
  durationMinutes: 60,
  priceCents: 5000,
  imageUrl: '',
  badgeText: '',
  categoryTag: '',
};

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServices(data);
    } catch {
      // Handle error
    }
    setLoading(false);
  }

  async function saveService() {
    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/services/${editingId}` : `${API_URL}/services`;

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          durationMinutes: form.durationMinutes,
          priceCents: form.priceCents,
          imageUrl: form.imageUrl || null,
          badgeText: form.badgeText || null,
          categoryTag: form.categoryTag || null,
        }),
      });
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo: 5MB');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/upload/image?category=service`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.url.startsWith('http') ? data.url : `http://localhost:3001${data.url}`;
        setForm({ ...form, imageUrl: url });
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  }

  async function deleteService(id: string) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  }

  function editService(service: Service) {
    setForm({
      name: service.name,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      imageUrl: service.imageUrl || '',
      badgeText: service.badgeText || '',
      categoryTag: service.categoryTag || '',
    });
    setEditingId(service.id);
    setShowForm(true);
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#faf8f5' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e8dfd3', borderTopColor: '#c9a66c', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 16 : 0, marginBottom: isMobile ? 20 : 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 600, color: '#3d3d3d', letterSpacing: '-0.3px' }}>Serviços</h1>
          <p style={{ margin: '8px 0 0', color: '#9a8b7a', fontSize: isMobile ? 13 : 15 }}>Gerencie os serviços oferecidos</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #c9a66c 0%, #9a7b4f 100%)',
            color: '#1f1b17',
            border: 'none',
            padding: isMobile ? '14px 20px' : '12px 24px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          + Novo Serviço
        </button>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div style={{ 
          background: 'white', 
          borderRadius: 16, 
          padding: 60, 
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(154, 123, 79, 0.08)',
          border: '1px solid #e8dfd3',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <h3 style={{ margin: '0 0 8px', color: '#3d3d3d' }}>Nenhum serviço cadastrado</h3>
          <p style={{ color: '#9a8b7a', margin: 0 }}>Adicione seu primeiro serviço para começar a receber agendamentos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 12 : 20 }}>
          {services.map(service => (
            <div 
              key={service.id}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                boxShadow: '0 2px 12px rgba(154, 123, 79, 0.08)',
                borderLeft: '4px solid #c9a66c',
                border: '1px solid #e8dfd3',
                borderLeftWidth: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#3d3d3d' }}>{service.name}</h3>
                <span style={{
                  background: service.isActive ? '#e8f4ec' : '#fceaea',
                  color: service.isActive ? '#5a9e6f' : '#c9756c',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {service.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                <div>
                  <div style={{ color: '#9a8b7a', fontSize: 12, marginBottom: 4 }}>Duração</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#3d3d3d' }}>{formatDuration(service.durationMinutes)}</div>
                </div>
                <div>
                  <div style={{ color: '#9a8b7a', fontSize: 12, marginBottom: 4 }}>Preço</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#5a9e6f' }}>{formatPrice(service.priceCents)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => editService(service)}
                  style={{
                    flex: 1,
                    background: '#f5f0e8',
                    border: 'none',
                    padding: '10px',
                    borderRadius: 8,
                    color: '#6b5b4f',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => deleteService(service.id)}
                  style={{
                    background: '#fceaea',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 8,
                    color: '#c9756c',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
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
            maxWidth: 520,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
              {editingId ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Imagem do Serviço */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Imagem do Serviço
                </label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {form.imageUrl ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={getImageUrl(form.imageUrl)}
                        alt="Preview"
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '2px solid #e5e7eb' }}
                      />
                      <button
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          width: 24, height: 24, borderRadius: '50%',
                          background: '#ef4444', border: 'none', color: 'white',
                          cursor: 'pointer', fontSize: 14, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >×</button>
                    </div>
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: 12,
                      border: '2px dashed #d1d5db', background: '#f9fafb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#9ca3af', fontSize: 12, textAlign: 'center',
                    }}>
                      Sem imagem
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: 10,
                        background: 'white',
                        color: '#374151',
                        fontWeight: 500,
                        cursor: uploading ? 'wait' : 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {uploading ? 'Enviando...' : '📷 Escolher Imagem'}
                    </button>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      JPG, PNG ou WebP. Máx 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Corte Feminino"
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

              {/* Descrição */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                  Descrição
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva o serviço em detalhes..."
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

              {/* Duração e Preço */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Duração (minutos) *
                  </label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={e => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
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
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    value={form.priceCents / 100}
                    onChange={e => setForm({ ...form, priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                    step="0.01"
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
              </div>

              {/* Categoria e Badge */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={form.categoryTag}
                    onChange={e => setForm({ ...form, categoryTag: e.target.value })}
                    placeholder="Ex: Cabelo, Unhas..."
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
                    Badge
                  </label>
                  <input
                    type="text"
                    value={form.badgeText}
                    onChange={e => setForm({ ...form, badgeText: e.target.value })}
                    placeholder="Ex: Promoção, Novo..."
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
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button
                onClick={() => setShowForm(false)}
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
                onClick={saveService}
                disabled={!form.name}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  borderRadius: 10,
                  background: form.name ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                  color: form.name ? 'white' : '#94a3b8',
                  fontWeight: 600,
                  cursor: form.name ? 'pointer' : 'not-allowed',
                  fontSize: 15,
                }}
              >
                {editingId ? 'Salvar' : 'Criar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
