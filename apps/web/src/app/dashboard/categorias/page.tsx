'use client';

import { useEffect, useState } from 'react';

interface ServiceCategory {
  id: string;
  name: string;
  iconEmoji: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { services: number };
}

const defaultForm = {
  name: '',
  iconEmoji: '',
  color: '',
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
  danger: '#dc2626',
};

const EMOJI_SUGGESTIONS = ['💇', '💅', '👁️', '🧖', '💆', '✨', '💄', '🪮', '🧴', '💪', '🦶', '💉', '🌿', '🔥'];
const COLOR_SUGGESTIONS = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#009688', '#4CAF50', '#FF9800', '#795548', '#607D8B'];

export default function CategoriasPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/service-categories?includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // keep state
    }
    setLoading(false);
  }

  async function saveCategory() {
    setSaving(true);
    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId
      ? `${API_URL}/service-categories/${editingId}`
      : `${API_URL}/service-categories`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          iconEmoji: form.iconEmoji || null,
          color: form.color || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Erro ao salvar');
        return;
      }
      closeForm();
      fetchCategories();
    } catch {
      alert('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Deseja remover a categoria "${name}"? Os serviços não serão excluídos, apenas ficarão sem categoria.`)) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/service-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCategories();
    } catch {
      alert('Erro ao remover');
    }
  }

  async function handleReorder(newOrder: ServiceCategory[]) {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/service-categories/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categoryIds: newOrder.map((c) => c.id) }),
      });
    } catch {
      fetchCategories(); // revert on error
    }
  }

  function openEdit(cat: ServiceCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      iconEmoji: cat.iconEmoji || '',
      color: cat.color || '',
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  }

  // Drag and drop handlers
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newCategories = [...categories];
    const dragged = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(index, 0, dragged);
    setCategories(newCategories);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    if (draggedIndex !== null) {
      handleReorder(categories);
    }
    setDraggedIndex(null);
  }

  // Mobile reorder buttons
  function moveUp(index: number) {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    setCategories(newCategories);
    handleReorder(newCategories);
  }

  function moveDown(index: number) {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    setCategories(newCategories);
    handleReorder(newCategories);
  }

  return (
    <div style={{ padding: isMobile ? 16 : 32, minHeight: '100vh', background: THEME.page }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, color: THEME.textPrimary, fontWeight: 600 }}>
            Categorias de Serviços
          </h1>
          <p style={{ margin: '4px 0 0', color: THEME.textSecondary, fontSize: 14 }}>
            Organize seus serviços em categorias
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: THEME.gold,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: isMobile ? '10px 16px' : '12px 20px',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          + Nova Categoria
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: THEME.textMuted }}>Carregando...</div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 60,
            background: THEME.surface,
            borderRadius: 12,
            border: `1px dashed ${THEME.border}`,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
          <p style={{ color: THEME.textSecondary, margin: 0 }}>
            Nenhuma categoria criada ainda.
            <br />
            Crie categorias para organizar seus serviços!
          </p>
        </div>
      )}

      {/* Categories list */}
      {!loading && categories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable={!isMobile}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                background: THEME.surface,
                borderRadius: 10,
                border: `1px solid ${THEME.border}`,
                cursor: isMobile ? 'default' : 'grab',
                opacity: draggedIndex === index ? 0.5 : 1,
              }}
            >
              {/* Drag handle / reorder buttons */}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      opacity: index === 0 ? 0.3 : 1,
                      fontSize: 14,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === categories.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 4,
                      cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: index === categories.length - 1 ? 0.3 : 1,
                      fontSize: 14,
                    }}
                  >
                    ▼
                  </button>
                </div>
              ) : (
                <span style={{ color: THEME.textMuted, cursor: 'grab' }}>☰</span>
              )}

              {/* Emoji + Color indicator */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: cat.color || THEME.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {cat.iconEmoji || '📁'}
              </div>

              {/* Name + count */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: THEME.textPrimary, fontSize: 15 }}>
                  {cat.name}
                </div>
                <div style={{ color: THEME.textMuted, fontSize: 13 }}>
                  {cat._count.services} {cat._count.services === 1 ? 'serviço' : 'serviços'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openEdit(cat)}
                  style={{
                    background: 'none',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: THEME.textSecondary,
                    fontSize: 13,
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => deleteCategory(cat.id, cat.name)}
                  style={{
                    background: 'none',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    color: THEME.danger,
                    fontSize: 13,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <p style={{ color: THEME.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            💡 {isMobile ? 'Use as setas para reordenar' : 'Arraste para reordenar as categorias'}
          </p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div
            style={{
              background: THEME.surface,
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: THEME.textPrimary }}>
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button
                onClick={closeForm}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: THEME.textMuted }}
              >
                ✕
              </button>
            </div>

            {/* Emoji selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary, fontSize: 14 }}>
                Emoji (opcional)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {EMOJI_SUGGESTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, iconEmoji: emoji })}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      border: form.iconEmoji === emoji ? `2px solid ${THEME.gold}` : `1px solid ${THEME.border}`,
                      background: THEME.page,
                      cursor: 'pointer',
                      fontSize: 20,
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ou digite um emoji..."
                value={form.iconEmoji}
                onChange={(e) => setForm({ ...form, iconEmoji: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 16,
                  background: THEME.page,
                }}
              />
            </div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary, fontSize: 14 }}>
                Nome da Categoria *
              </label>
              <input
                type="text"
                placeholder="Ex: Cabelo, Unhas, Sobrancelha..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 16,
                  background: THEME.page,
                }}
              />
            </div>

            {/* Color selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary, fontSize: 14 }}>
                Cor de destaque (opcional)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, color: '' })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: !form.color ? `2px solid ${THEME.gold}` : `1px solid ${THEME.border}`,
                    background: THEME.page,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: THEME.textMuted,
                  }}
                >
                  ✕
                </button>
                {COLOR_SUGGESTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: form.color === color ? `2px solid ${THEME.textPrimary}` : '2px solid transparent',
                      background: color,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 24, padding: 16, background: THEME.page, borderRadius: 10 }}>
              <div style={{ color: THEME.textMuted, fontSize: 12, marginBottom: 8 }}>Prévia:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: form.color || THEME.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  {form.iconEmoji || '📁'}
                </div>
                <span style={{ fontWeight: 500, color: THEME.textPrimary }}>
                  {form.name || 'Nome da categoria'}
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={saveCategory}
              disabled={!form.name.trim() || saving}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 10,
                border: 'none',
                background: !form.name.trim() ? THEME.border : THEME.gold,
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                cursor: !form.name.trim() ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
