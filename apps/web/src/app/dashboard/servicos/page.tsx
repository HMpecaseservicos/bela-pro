'use client';

import { useEffect, useRef, useState } from 'react';
import { getImageUrl } from '@/lib/utils';

interface ServiceCategory {
  id: string;
  name: string;
  iconEmoji: string | null;
  color: string | null;
}

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
  categoryId: string | null;
  category: ServiceCategory | null;
}

const defaultForm = {
  name: '',
  description: '',
  durationMinutes: 60,
  priceCents: 5000,
  imageUrl: '',
  badgeText: '',
  categoryId: '',
};

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  border: '#e4dbcf',
};

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
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
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/service-categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // keep state
    }
  }

  async function fetchServices() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      // keep state
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
          categoryId: form.categoryId || null,
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
      alert('Arquivo muito grande. Maximo: 5MB');
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
    if (!confirm('Tem certeza que deseja excluir este servico?')) return;
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
      categoryId: service.categoryId || '',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: THEME.page }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${THEME.border}`, borderTopColor: THEME.gold, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 30, maxWidth: 1280, margin: '0 auto' }}>
      <section
        style={{
          borderRadius: 18,
          border: `1px solid ${THEME.border}`,
          background: 'linear-gradient(180deg, #fbf8f3 0%, #f7f2ea 100%)',
          padding: isMobile ? 18 : 26,
          marginBottom: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 14,
        }}
      >
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: isMobile ? 29 : 38, color: THEME.textPrimary, fontWeight: 600 }}>
            Servicos
          </h1>
          <p style={{ margin: '10px 0 0', color: THEME.textSecondary, fontSize: isMobile ? 13 : 14 }}>
            Catalogo e posicionamento dos seus servicos premium.
          </p>
        </div>

        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #c9a66b 0%, #a07a45 100%)',
            color: '#241c13',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.02em',
            cursor: 'pointer',
          }}
        >
          Adicionar Servico
        </button>
      </section>

      {services.length === 0 ? (
        <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 42, textAlign: 'center' }}>
          <h3 className="font-display" style={{ margin: 0, color: THEME.textPrimary, fontSize: 26, fontWeight: 600 }}>Nenhum servico cadastrado</h3>
          <p style={{ margin: '10px 0 0', color: THEME.textMuted }}>Crie seu primeiro servico para abrir agenda e precificacao.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {services.map(service => (
            <article
              key={service.id}
              style={{
                background: THEME.surface,
                border: `1px solid ${THEME.border}`,
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 6px 20px rgba(72, 52, 26, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, color: THEME.textPrimary, fontSize: 18, fontWeight: 700 }}>{service.name}</h3>
                  {service.description && <p style={{ margin: '6px 0 0', color: THEME.textSecondary, fontSize: 12 }}>{service.description}</p>}
                  {service.category && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: service.category.color || THEME.border,
                      color: service.category.color ? '#fff' : THEME.textSecondary,
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {service.category.iconEmoji && <span>{service.category.iconEmoji}</span>}
                      {service.category.name}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    background: service.isActive ? '#e9f3eb' : '#f8e9e7',
                    color: service.isActive ? '#5f8f67' : '#b86a5f',
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {service.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {service.imageUrl && (
                <img
                  src={getImageUrl(service.imageUrl)}
                  alt={service.name}
                  style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, border: `1px solid ${THEME.border}`, marginBottom: 12 }}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <InfoCell label="Duracao" value={formatDuration(service.durationMinutes)} />
                <InfoCell label="Preco" value={formatPrice(service.priceCents)} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => editService(service)}
                  style={{
                    flex: 1,
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 10,
                    padding: '9px 10px',
                    background: '#f7f2ea',
                    color: THEME.textPrimary,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteService(service.id)}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 12px',
                    background: '#f8e9e7',
                    color: '#b86a5f',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            padding: 18,
            background: 'rgba(34, 28, 22, 0.52)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: THEME.surface,
              borderRadius: 18,
              border: `1px solid ${THEME.border}`,
              boxShadow: '0 12px 32px rgba(72, 52, 26, 0.16)',
              padding: 22,
            }}
          >
            <h2 className="font-display" style={{ margin: '0 0 16px', fontSize: 30, color: THEME.textPrimary, fontWeight: 600 }}>
              {editingId ? 'Editar Servico' : 'Novo Servico'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Imagem">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {form.imageUrl ? (
                    <img src={getImageUrl(form.imageUrl)} alt="Preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1px solid ${THEME.border}` }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 10, border: `1px dashed ${THEME.border}`, background: '#f7f2ea' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{ width: '100%', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '10px 12px', background: '#fff', color: THEME.textPrimary, fontWeight: 600, cursor: uploading ? 'wait' : 'pointer' }}
                    >
                      {uploading ? 'Enviando imagem...' : 'Selecionar imagem'}
                    </button>
                  </div>
                </div>
              </Field>

              <Field label="Nome do Servico *">
                <Input value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Ex: Corte Feminino" />
              </Field>

              <Field label="Descricao">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva o servico"
                  style={{ width: '100%', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px 12px', background: '#fff', color: THEME.textPrimary, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Duracao *">
                  <select
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px 12px', background: '#fff', color: THEME.textPrimary, cursor: 'pointer' }}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h 30min</option>
                    <option value={120}>2 horas</option>
                    <option value={150}>2h 30min</option>
                    <option value={180}>3 horas</option>
                    <option value={210}>3h 30min</option>
                    <option value={240}>4 horas</option>
                    <option value={300}>5 horas</option>
                    <option value={360}>6 horas</option>
                  </select>
                </Field>
                <Field label="Preco (R$) *">
                  <input
                    type="number"
                    value={form.priceCents / 100}
                    step="0.01"
                    onChange={(e) => setForm({ ...form, priceCents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                    style={{ width: '100%', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px 12px', background: '#fff', color: THEME.textPrimary }}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Categoria">
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    style={{ width: '100%', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px 12px', background: '#fff', color: THEME.textPrimary, cursor: 'pointer' }}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.iconEmoji ? `${cat.iconEmoji} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Badge">
                  <Input value={form.badgeText} onChange={(value) => setForm({ ...form, badgeText: value })} placeholder="Ex: Destaque" />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ flex: 1, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '11px', background: '#fff', color: THEME.textSecondary, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={saveService}
                disabled={!form.name}
                style={{ flex: 1, border: 'none', borderRadius: 10, padding: '11px', background: form.name ? 'linear-gradient(135deg, #c9a66b 0%, #a07a45 100%)' : '#d6cec2', color: '#241c13', fontWeight: 700, cursor: form.name ? 'pointer' : 'not-allowed' }}
              >
                {editingId ? 'Salvar Alteracoes' : 'Criar Servico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f7f2ea', border: '1px solid #e4dbcf', borderRadius: 10, padding: '9px 10px' }}>
      <div style={{ fontSize: 11, color: '#9b8e81', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 3, fontSize: 13, color: '#2f2a24', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, color: '#6e6256', fontSize: 12, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', border: '1px solid #e4dbcf', borderRadius: 10, padding: '11px 12px', background: '#fff', color: '#2f2a24' }}
    />
  );
}
