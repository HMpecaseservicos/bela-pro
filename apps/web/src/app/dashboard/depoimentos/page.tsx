'use client';

import { useEffect, useState } from 'react';
import { Star, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Testimonial {
  id: string;
  clientName: string;
  rating: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function DepoimentosPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState({ clientName: '', rating: 5, text: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/testimonials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setItems(await res.json());
    } catch { /* */ }
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ clientName: '', rating: 5, text: '', sortOrder: items.length });
    setShowModal(true);
  }

  function openEdit(t: Testimonial) {
    setEditing(t);
    setForm({ clientName: t.clientName, rating: t.rating, text: t.text, sortOrder: t.sortOrder });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const token = localStorage.getItem('token');
    const url = editing
      ? `${API_URL}/testimonials/${editing.id}`
      : `${API_URL}/testimonials`;
    try {
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        fetchItems();
      }
    } catch { /* */ }
    setSaving(false);
  }

  async function toggleActive(t: Testimonial) {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/testimonials/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este depoimento?')) return;
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/testimonials/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchItems();
  }

  function renderStars(count: number, interactive = false) {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={interactive ? 22 : 16}
            fill={i <= count ? '#f59e0b' : 'none'}
            color={i <= count ? '#f59e0b' : '#d1d5db'}
            style={interactive ? { cursor: 'pointer' } : undefined}
            onClick={interactive ? () => setForm(f => ({ ...f, rating: i })) : undefined}
          />
        ))}
      </div>
    );
  }

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center', color: '#8b7355' }}>Carregando...</div>
  );

  return (
    <div style={{ padding: '16px 16px 100px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#3d2e1f' }}>Depoimentos</h1>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: '#8b7355', color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Novo
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 48, background: '#faf7f2', borderRadius: 16,
          border: '2px dashed #e4dbcf',
        }}>
          <Star size={48} color="#d1c4a9" style={{ marginBottom: 12 }} />
          <p style={{ color: '#8b7355', fontSize: 16, fontWeight: 600 }}>Nenhum depoimento ainda</p>
          <p style={{ color: '#9b8e81', fontSize: 14, marginTop: 4 }}>
            Adicione avaliações de clientes para exibir na sua página
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(t => (
            <div
              key={t.id}
              style={{
                background: '#fff', borderRadius: 14, padding: 16,
                border: `1px solid ${t.isActive ? '#e4dbcf' : '#f3f4f6'}`,
                opacity: t.isActive ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#3d2e1f' }}>{t.clientName}</div>
                  {renderStars(t.rating)}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleActive(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.isActive ? '#22c55e' : '#9ca3af' }}>
                    {t.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b7355' }}>
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p style={{ marginTop: 8, fontSize: 14, color: '#6e6256', lineHeight: 1.5 }}>
                &ldquo;{t.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3d2e1f', marginBottom: 16 }}>
              {editing ? 'Editar Depoimento' : 'Novo Depoimento'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6e6256', marginBottom: 4, display: 'block' }}>
                  Nome do cliente
                </label>
                <input
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Ex: Maria Silva"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e4dbcf', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6e6256', marginBottom: 4, display: 'block' }}>
                  Avaliação
                </label>
                {renderStars(form.rating, true)}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6e6256', marginBottom: 4, display: 'block' }}>
                  Depoimento
                </label>
                <textarea
                  value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  placeholder="O que o cliente disse..."
                  rows={4}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e4dbcf', fontSize: 14, resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#6e6256', marginBottom: 4, display: 'block' }}>
                  Ordem de exibição
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: 80, padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e4dbcf', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid #e4dbcf',
                  background: '#fff', color: '#6e6256', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.clientName || !form.text}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: saving || !form.clientName || !form.text ? '#d1c4a9' : '#8b7355',
                  color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
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
