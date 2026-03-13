'use client';

import { useEffect, useState, useRef } from 'react';
import { getImageUrl } from '@/lib/utils';

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  coverImageUrl: string | null;
  websiteUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  tier: 'DIAMOND' | 'GOLD' | 'SILVER' | 'BRONZE';
  displayOrder: number;
  isActive: boolean;
}

interface Settings {
  showGlobalSponsors: boolean;
  localSponsorsEnabled: boolean;
  localSponsorsLimit: number;
  currentCount: number;
  remaining: number;
}

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  logoLightUrl: '',
  logoDarkUrl: '',
  coverImageUrl: '',
  websiteUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  tier: 'SILVER' as Sponsor['tier'],
  displayOrder: 0,
  isActive: true,
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
  success: '#2e7d32',
  error: '#c62828',
};

const TIER_COLORS: Record<Sponsor['tier'], { bg: string; text: string; border: string }> = {
  DIAMOND: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
  GOLD: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  SILVER: { bg: '#f5f5f5', text: '#616161', border: '#bdbdbd' },
  BRONZE: { bg: '#fbe9e7', text: '#bf360c', border: '#ffccbc' },
};

const TIER_LABELS: Record<Sponsor['tier'], string> = {
  DIAMOND: '💎 Diamond',
  GOLD: '🥇 Gold',
  SILVER: '🥈 Silver',
  BRONZE: '🥉 Bronze',
};

export default function PatrocinadoresPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [uploadField, setUploadField] = useState<'logoLightUrl' | 'logoDarkUrl' | 'coverImageUrl' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const [sponsorsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/workspace/sponsors`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/workspace/sponsors/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sponsorsRes.ok) {
        const data = await sponsorsRes.json();
        setSponsors(data);
      }
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
    } catch {
      setError('Erro ao carregar dados');
    }
    setLoading(false);
  }

  async function toggleGlobalSponsors(show: boolean) {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/workspace/sponsors/settings/show-global`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ showGlobal: show }),
      });
      if (res.ok) {
        setSettings(prev => prev ? { ...prev, showGlobalSponsors: show } : null);
        setSuccess(show ? 'Anúncios globais ativados' : 'Anúncios globais desativados');
      }
    } catch {
      setError('Erro ao atualizar configuração');
    }
  }

  async function saveSponsor() {
    const token = localStorage.getItem('token');
    setError(null);

    // Validação
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug é obrigatório');
      return;
    }

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `${API_URL}/workspace/sponsors/${editingId}` 
      : `${API_URL}/workspace/sponsors`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          logoLightUrl: form.logoLightUrl || null,
          logoDarkUrl: form.logoDarkUrl || null,
          coverImageUrl: form.coverImageUrl || null,
          websiteUrl: form.websiteUrl || null,
          ctaLabel: form.ctaLabel || null,
          ctaUrl: form.ctaUrl || null,
          tier: form.tier,
          displayOrder: form.displayOrder,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao salvar');
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      setSuccess(editingId ? 'Patrocinador atualizado!' : 'Patrocinador criado!');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar patrocinador');
    }
  }

  async function deleteSponsor(id: string) {
    if (!confirm('Tem certeza que deseja remover este patrocinador?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/workspace/sponsors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess('Patrocinador removido!');
        fetchData();
      }
    } catch {
      setError('Erro ao remover patrocinador');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const token = localStorage.getItem('token');
    const endpoint = isActive ? 'deactivate' : 'activate';
    try {
      await fetch(`${API_URL}/workspace/sponsors/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch {
      setError('Erro ao atualizar status');
    }
  }

  function handleEdit(sponsor: Sponsor) {
    setForm({
      name: sponsor.name,
      slug: sponsor.slug,
      description: sponsor.description || '',
      logoLightUrl: sponsor.logoLightUrl || '',
      logoDarkUrl: sponsor.logoDarkUrl || '',
      coverImageUrl: sponsor.coverImageUrl || '',
      websiteUrl: sponsor.websiteUrl || '',
      ctaLabel: sponsor.ctaLabel || '',
      ctaUrl: sponsor.ctaUrl || '',
      tier: sponsor.tier,
      displayOrder: sponsor.displayOrder,
      isActive: sponsor.isActive,
    });
    setEditingId(sponsor.id);
    setShowForm(true);
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function handleUpload(file: File, field: 'logoLightUrl' | 'logoDarkUrl' | 'coverImageUrl') {
    const token = localStorage.getItem('token');
    setUploading(true);
    setUploadField(field);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'sponsors');

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({ ...prev, [field]: data.url }));
      }
    } catch {
      setError('Erro ao enviar imagem');
    }
    setUploading(false);
    setUploadField(null);
  }

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: THEME.textMuted }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
        Carregando...
      </div>
    );
  }

  // Se recurso não está habilitado
  if (settings && !settings.localSponsorsEnabled) {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          border: `2px solid ${THEME.gold}`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h2 style={{ color: THEME.gold, marginBottom: 12, fontSize: 24 }}>
            Patrocinadores Locais
          </h2>
          <p style={{ color: THEME.textSecondary, marginBottom: 24, lineHeight: 1.6 }}>
            Mostre seus próprios parceiros e patrocinadores na sua página de agendamento!
            Com este recurso premium, você pode adicionar anúncios de parceiros locais
            e até desativar os anúncios globais.
          </p>
          <a
            href="/dashboard/plano"
            style={{
              display: 'inline-block',
              background: `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`,
              color: 'white',
              padding: '14px 32px',
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: 16,
            }}
          >
            🚀 Fazer Upgrade
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ color: THEME.textPrimary, fontSize: 28, margin: 0 }}>
            🎯 Meus Patrocinadores
          </h1>
          <p style={{ color: THEME.textMuted, margin: '4px 0 0', fontSize: 14 }}>
            Gerencie seus parceiros e anunciantes locais
          </p>
        </div>

        {settings && (
          <div style={{
            background: THEME.surface,
            padding: '12px 20px',
            borderRadius: 12,
            border: `1px solid ${THEME.border}`,
            fontSize: 14,
          }}>
            <span style={{ color: THEME.textMuted }}>Limite: </span>
            <strong style={{ color: THEME.gold }}>
              {settings.localSponsorsLimit === 0 
                ? '∞ Ilimitado' 
                : `${settings.currentCount}/${settings.localSponsorsLimit}`}
            </strong>
          </div>
        )}
      </div>

      {/* Mensagens */}
      {error && (
        <div style={{
          background: '#ffebee',
          color: THEME.error,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{
          background: '#e8f5e9',
          color: THEME.success,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ✅ {success}
        </div>
      )}

      {/* Configuração de Anúncios Globais */}
      {settings && (
        <div style={{
          background: THEME.surface,
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          border: `1px solid ${THEME.border}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div>
              <div style={{ 
                fontWeight: 600, 
                color: THEME.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                📢 Exibir Anúncios Globais
              </div>
              <div style={{ color: THEME.textMuted, fontSize: 13, marginTop: 4 }}>
                Mostra os patrocinadores da plataforma na sua página de agendamento
              </div>
            </div>
            <button
              onClick={() => toggleGlobalSponsors(!settings.showGlobalSponsors)}
              style={{
                background: settings.showGlobalSponsors 
                  ? `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`
                  : '#e0e0e0',
                color: settings.showGlobalSponsors ? 'white' : THEME.textSecondary,
                border: 'none',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
                minWidth: 100,
              }}
            >
              {settings.showGlobalSponsors ? '✓ Ativado' : 'Desativado'}
            </button>
          </div>
        </div>
      )}

      {/* Botão Adicionar */}
      {settings && (settings.localSponsorsLimit === 0 || settings.remaining > 0) && !showForm && (
        <button
          onClick={() => {
            setForm(defaultForm);
            setEditingId(null);
            setShowForm(true);
          }}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`,
            color: 'white',
            border: 'none',
            padding: '16px 24px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          ➕ Adicionar Patrocinador
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <div style={{
          background: THEME.surface,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          border: `1px solid ${THEME.border}`,
        }}>
          <h3 style={{ margin: '0 0 20px', color: THEME.textPrimary }}>
            {editingId ? '✏️ Editar Patrocinador' : '➕ Novo Patrocinador'}
          </h3>

          <div style={{ display: 'grid', gap: 16 }}>
            {/* Nome e Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    setForm(prev => ({
                      ...prev,
                      name,
                      slug: prev.slug || generateSlug(name),
                    }));
                  }}
                  placeholder="Ex: Salão Elegance"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="salao-elegance"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Breve descrição do patrocinador..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${THEME.border}`,
                  fontSize: 15,
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Tier e Site */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Nível de Destaque
                </label>
                <select
                  value={form.tier}
                  onChange={e => setForm(prev => ({ ...prev, tier: e.target.value as Sponsor['tier'] }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: 'white',
                  }}
                >
                  {Object.entries(TIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Website
                </label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={e => setForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Texto do Botão (CTA)
                </label>
                <input
                  type="text"
                  value={form.ctaLabel}
                  onChange={e => setForm(prev => ({ ...prev, ctaLabel: e.target.value }))}
                  placeholder="Ex: Saiba Mais"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 14 }}>
                  Link do Botão
                </label>
                <input
                  type="url"
                  value={form.ctaUrl}
                  onChange={e => setForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Imagens */}
            <div>
              <label style={{ display: 'block', marginBottom: 10, color: THEME.textSecondary, fontSize: 14 }}>
                Imagens
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {/* Logo Light */}
                <div
                  onClick={() => {
                    setUploadField('logoLightUrl');
                    fileInputRef.current?.click();
                  }}
                  style={{
                    border: `2px dashed ${THEME.border}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: form.logoLightUrl ? '#f5f5f5' : 'white',
                  }}
                >
                  {form.logoLightUrl ? (
                    <img
                      src={getImageUrl(form.logoLightUrl)}
                      alt="Logo"
                      style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: THEME.textMuted, fontSize: 13 }}>
                      {uploading && uploadField === 'logoLightUrl' ? '⏳' : '🖼️'}<br />
                      Logo (claro)
                    </div>
                  )}
                </div>

                {/* Logo Dark */}
                <div
                  onClick={() => {
                    setUploadField('logoDarkUrl');
                    fileInputRef.current?.click();
                  }}
                  style={{
                    border: `2px dashed ${THEME.border}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: form.logoDarkUrl ? '#333' : '#f5f5f5',
                  }}
                >
                  {form.logoDarkUrl ? (
                    <img
                      src={getImageUrl(form.logoDarkUrl)}
                      alt="Logo Dark"
                      style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ color: THEME.textMuted, fontSize: 13 }}>
                      {uploading && uploadField === 'logoDarkUrl' ? '⏳' : '🌙'}<br />
                      Logo (escuro)
                    </div>
                  )}
                </div>

                {/* Cover */}
                <div
                  onClick={() => {
                    setUploadField('coverImageUrl');
                    fileInputRef.current?.click();
                  }}
                  style={{
                    border: `2px dashed ${THEME.border}`,
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: form.coverImageUrl ? '#f5f5f5' : 'white',
                  }}
                >
                  {form.coverImageUrl ? (
                    <img
                      src={getImageUrl(form.coverImageUrl)}
                      alt="Cover"
                      style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ color: THEME.textMuted, fontSize: 13 }}>
                      {uploading && uploadField === 'coverImageUrl' ? '⏳' : '🎨'}<br />
                      Capa
                    </div>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && uploadField) {
                    handleUpload(file, uploadField);
                  }
                  e.target.value = '';
                }}
              />
            </div>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                style={{ width: 20, height: 20 }}
              />
              <label htmlFor="isActive" style={{ color: THEME.textSecondary }}>
                Patrocinador ativo (visível na página de agendamento)
              </label>
            </div>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              onClick={saveSponsor}
              disabled={uploading}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${THEME.gold} 0%, ${THEME.goldSoft} 100%)`,
                color: 'white',
                border: 'none',
                padding: '14px 24px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? '⏳ Enviando...' : (editingId ? '💾 Salvar Alterações' : '✅ Criar Patrocinador')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(defaultForm);
              }}
              style={{
                padding: '14px 24px',
                borderRadius: 10,
                border: `1px solid ${THEME.border}`,
                background: 'white',
                color: THEME.textSecondary,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Patrocinadores */}
      {sponsors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 48,
          color: THEME.textMuted,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <p>Nenhum patrocinador cadastrado ainda.</p>
          <p style={{ fontSize: 14 }}>Adicione seus parceiros para exibir na sua página de agendamento!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {sponsors.map(sponsor => (
            <div
              key={sponsor.id}
              style={{
                background: THEME.surface,
                borderRadius: 12,
                padding: 20,
                border: `1px solid ${sponsor.isActive ? THEME.border : '#e0e0e0'}`,
                opacity: sponsor.isActive ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Logo */}
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {sponsor.logoLightUrl ? (
                  <img
                    src={getImageUrl(sponsor.logoLightUrl)}
                    alt={sponsor.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: 24 }}>🏢</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: THEME.textPrimary }}>
                    {sponsor.name}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: TIER_COLORS[sponsor.tier].bg,
                    color: TIER_COLORS[sponsor.tier].text,
                    border: `1px solid ${TIER_COLORS[sponsor.tier].border}`,
                  }}>
                    {sponsor.tier}
                  </span>
                  {!sponsor.isActive && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      background: '#f5f5f5',
                      color: THEME.textMuted,
                    }}>
                      Inativo
                    </span>
                  )}
                </div>
                {sponsor.description && (
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    color: THEME.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {sponsor.description}
                  </p>
                )}
                {sponsor.websiteUrl && (
                  <a
                    href={sponsor.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: THEME.gold,
                      textDecoration: 'none',
                    }}
                  >
                    🔗 {sponsor.websiteUrl}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => toggleActive(sponsor.id, sponsor.isActive)}
                  title={sponsor.isActive ? 'Desativar' : 'Ativar'}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  {sponsor.isActive ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  onClick={() => handleEdit(sponsor)}
                  title="Editar"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteSponsor(sponsor.id)}
                  title="Remover"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${THEME.border}`,
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
