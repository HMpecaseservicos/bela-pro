'use client';

import { useEffect, useState, useRef } from 'react';

const THEME_PRESETS = [
  { id: 'rose_gold', name: 'Rose Gold', primary: '#B76E79', accent: '#D4A574', bg: '#FDF8F5' },
  { id: 'burgundy', name: 'Burgundy', primary: '#722F37', accent: '#C9A050', bg: '#FBF7F4' },
  { id: 'olive_green', name: 'Verde Oliva', primary: '#556B2F', accent: '#B8860B', bg: '#F5F5DC' },
  { id: 'classic_dark', name: 'Clássico Escuro', primary: '#2C2C2C', accent: '#D4AF37', bg: '#1A1A1A' },
  { id: 'ocean_blue', name: 'Azul Oceano', primary: '#1E3A5F', accent: '#4A90A4', bg: '#F0F8FF' },
  { id: 'custom', name: 'Personalizado', primary: '#667eea', accent: '#8b5cf6', bg: '#FFFFFF' },
];

interface WorkspaceConfig {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  primaryColorHex: string | null;
  accentColorHex: string | null;
  welcomeText: string | null;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryUrls: string[];
  themePreset: string | null;
}

export default function AparenciaPage() {
  const [config, setConfig] = useState({
    brandName: '',
    slug: '',
    primaryColorHex: '#667eea',
    accentColorHex: '#8b5cf6',
    welcomeText: 'Agende seu horário conosco!',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    galleryUrls: [] as string[],
    themePreset: '' as string,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const API_URL = 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, []);

  async function fetchWorkspace() {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/workspace/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erro ao carregar');

      const data: WorkspaceConfig = await res.json();
      setConfig({
        brandName: data.brandName || data.name || '',
        slug: data.slug || '',
        primaryColorHex: data.primaryColorHex || '#667eea',
        accentColorHex: data.accentColorHex || '#8b5cf6',
        welcomeText: data.welcomeText || 'Agende seu horário conosco!',
        description: data.description || '',
        logoUrl: data.logoUrl || '',
        coverImageUrl: data.coverImageUrl || '',
        galleryUrls: data.galleryUrls || [],
        themePreset: data.themePreset || '',
      });
    } catch {
      setError('Erro ao carregar configurações');
    }
    setLoading(false);
  }

  async function uploadImage(file: File, category: 'logo' | 'cover' | 'gallery'): Promise<string | null> {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use: JPG, PNG, GIF ou WebP');
      return null;
    }

    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo: 5MB');
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/upload/image?category=${category}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao fazer upload');
      }

      const data = await res.json();
      return data.url.startsWith('http') ? data.url : `http://localhost:3001${data.url}`;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
      return null;
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    setError('');
    const url = await uploadImage(file, 'logo');
    if (url) setConfig({ ...config, logoUrl: url });
    setUploadingLogo(false);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingCover(true);
    setError('');
    const url = await uploadImage(file, 'cover');
    if (url) setConfig({ ...config, coverImageUrl: url });
    setUploadingCover(false);
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (config.galleryUrls.length >= 10) {
      setError('Máximo de 10 imagens na galeria');
      return;
    }
    
    setUploadingGallery(true);
    setError('');
    const url = await uploadImage(file, 'gallery');
    if (url) setConfig({ ...config, galleryUrls: [...config.galleryUrls, url] });
    setUploadingGallery(false);
  }

  function removeGalleryImage(index: number) {
    setConfig({
      ...config,
      galleryUrls: config.galleryUrls.filter((_, i) => i !== index),
    });
  }

  async function handleSave() {
    const token = localStorage.getItem('token');
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/workspace/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          brandName: config.brandName,
          primaryColorHex: config.primaryColorHex,
          accentColorHex: config.accentColorHex || null,
          welcomeText: config.welcomeText,
          description: config.description || null,
          logoUrl: config.logoUrl || null,
          coverImageUrl: config.coverImageUrl || null,
          galleryUrls: config.galleryUrls,
          themePreset: config.themePreset || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao salvar');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    }
    setSaving(false);
  }

  function handleThemeSelect(themeId: string) {
    const theme = THEME_PRESETS.find(t => t.id === themeId);
    if (theme) {
      setConfig({
        ...config,
        themePreset: themeId,
        primaryColorHex: theme.primary,
        accentColorHex: theme.accent,
      });
    }
  }

  const bookingUrl = `http://localhost:3000/${config.slug || 'seu-salao'}/booking`;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 8,
    fontWeight: 500,
    color: '#374151',
    fontSize: 14,
  };

  const sectionStyle = {
    background: 'white',
    borderRadius: isMobile ? 12 : 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    padding: isMobile ? 16 : 32,
    marginBottom: isMobile ? 16 : 24,
  };

  const uploadBoxStyle = (uploading: boolean, hasImage: boolean): React.CSSProperties => ({
    border: '2px dashed #d1d5db',
    borderRadius: 12,
    padding: hasImage ? 0 : (isMobile ? 16 : 24),
    textAlign: 'center' as const,
    cursor: uploading ? 'wait' : 'pointer',
    background: uploading ? '#f3f4f6' : '#fafafa',
    transition: 'all 0.2s',
    position: 'relative' as const,
    overflow: 'hidden',
  });

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>Aparência</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>Personalize a experiência de agendamento</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: isMobile ? 12 : 16, borderRadius: 12, marginBottom: isMobile ? 16 : 24, fontSize: isMobile ? 13 : 14 }}>
          {error}
        </div>
      )}

      {/* Booking Link */}
      <div style={{
        background: `linear-gradient(135deg, ${config.primaryColorHex} 0%, ${adjustColor(config.primaryColorHex, -30)} 100%)`,
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? 16 : 24,
        marginBottom: isMobile ? 20 : 32,
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: isMobile ? 20 : 24 }}>🔗</span>
          <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>Link de Agendamento</h3>
        </div>
        <p style={{ margin: '0 0 16px', opacity: 0.9, fontSize: isMobile ? 12 : 14 }}>
          Compartilhe este link com seus clientes
        </p>
        <div style={{
          display: 'flex',
          gap: 12,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={bookingUrl}
            readOnly
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={() => navigator.clipboard.writeText(bookingUrl)}
            style={{
              background: 'white',
              color: config.primaryColorHex,
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Copiar
          </button>
        </div>
      </div>

      {/* Logo e Imagens */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>🖼️ Imagens</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, marginBottom: 24 }}>
          {/* Logo */}
          <div>
            <label style={labelStyle}>Logo</label>
            <div
              onClick={() => !uploadingLogo && logoInputRef.current?.click()}
              style={{
                ...uploadBoxStyle(uploadingLogo, !!config.logoUrl),
                width: 160,
                height: 160,
              }}
            >
              {config.logoUrl ? (
                <>
                  <img src={config.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <span style={{ color: 'white', fontWeight: 600 }}>Trocar</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setConfig({ ...config, logoUrl: '' }); }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                </>
              ) : uploadingLogo ? (
                <>
                  <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: 13 }}>Enviando...</p>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 40 }}>📷</span>
                  <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>Clique para enviar</p>
                  <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 11 }}>200x200px • Máx 5MB</p>
                </>
              )}
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
          </div>

          {/* Cover Image */}
          <div>
            <label style={labelStyle}>Imagem de Capa</label>
            <div
              onClick={() => !uploadingCover && coverInputRef.current?.click()}
              style={{
                ...uploadBoxStyle(uploadingCover, !!config.coverImageUrl),
                height: 160,
              }}
            >
              {config.coverImageUrl ? (
                <>
                  <img src={config.coverImageUrl} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <span style={{ color: 'white', fontWeight: 600 }}>Trocar imagem</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setConfig({ ...config, coverImageUrl: '' }); }}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 16,
                    }}
                  >
                    ×
                  </button>
                </>
              ) : uploadingCover ? (
                <>
                  <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: 13 }}>Enviando...</p>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 40 }}>🌄</span>
                  <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>Clique para enviar imagem de capa</p>
                  <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 11 }}>1200x400px recomendado • Máx 5MB</p>
                </>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
          </div>
        </div>

        {/* Gallery */}
        <div>
          <label style={labelStyle}>Galeria de Imagens ({config.galleryUrls.length}/10)</label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {config.galleryUrls.map((url, index) => (
              <div key={index} style={{ position: 'relative', width: 100, height: 100, borderRadius: 10, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                <img src={url} alt={`Galeria ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => removeGalleryImage(index)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {config.galleryUrls.length < 10 && (
              <div
                onClick={() => !uploadingGallery && galleryInputRef.current?.click()}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 10,
                  border: '2px dashed #d1d5db',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: uploadingGallery ? 'wait' : 'pointer',
                  background: '#fafafa',
                }}
              >
                {uploadingGallery ? (
                  <div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <span style={{ fontSize: 24, color: '#9ca3af' }}>+</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Adicionar</span>
                  </>
                )}
              </div>
            )}
          </div>
          <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleGalleryUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Tema */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>🎨 Tema Visual</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
          {THEME_PRESETS.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              style={{
                padding: 16,
                borderRadius: 12,
                border: config.themePreset === theme.id ? `3px solid ${theme.primary}` : '2px solid #e5e7eb',
                background: theme.bg,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: theme.primary }} />
                <div style={{ width: 24, height: 24, borderRadius: 6, background: theme.accent }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>{theme.name}</div>
              {config.themePreset === theme.id && (
                <div style={{ marginTop: 8, fontSize: 12, color: theme.primary, fontWeight: 500 }}>✓ Selecionado</div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Colors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <label style={labelStyle}>Cor Principal</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="color"
                value={config.primaryColorHex}
                onChange={e => setConfig({ ...config, primaryColorHex: e.target.value, themePreset: 'custom' })}
                style={{ width: 50, height: 50, border: 'none', borderRadius: 10, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={config.primaryColorHex}
                onChange={e => setConfig({ ...config, primaryColorHex: e.target.value, themePreset: 'custom' })}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Cor de Destaque</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="color"
                value={config.accentColorHex}
                onChange={e => setConfig({ ...config, accentColorHex: e.target.value, themePreset: 'custom' })}
                style={{ width: 50, height: 50, border: 'none', borderRadius: 10, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={config.accentColorHex}
                onChange={e => setConfig({ ...config, accentColorHex: e.target.value, themePreset: 'custom' })}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Textos */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>✏️ Textos</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={labelStyle}>Nome do Negócio</label>
            <input
              type="text"
              value={config.brandName}
              onChange={e => setConfig({ ...config, brandName: e.target.value })}
              placeholder="Ex: Studio Beleza"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Texto de Boas-vindas</label>
            <input
              type="text"
              value={config.welcomeText}
              onChange={e => setConfig({ ...config, welcomeText: e.target.value })}
              placeholder="Ex: Agende seu horário conosco!"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição (opcional)</label>
            <textarea
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
              placeholder="Conte um pouco sobre o seu negócio..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 600, color: '#1e293b' }}>👁️ Prévia</h3>
        
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
          {config.coverImageUrl ? (
            <div style={{
              height: 150,
              backgroundImage: `linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7)), url(${config.coverImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {config.logoUrl && (
                  <img src={config.logoUrl} alt="Logo" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: '3px solid white' }} />
                )}
                <div>
                  <h2 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 700 }}>{config.brandName || 'Seu Negócio'}</h2>
                  <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{config.welcomeText}</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: `linear-gradient(135deg, ${config.primaryColorHex} 0%, ${adjustColor(config.primaryColorHex, -30)} 100%)`,
              padding: 40,
              textAlign: 'center',
              color: 'white',
            }}>
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
              ) : (
                <div style={{
                  width: 60,
                  height: 60,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                  margin: '0 auto 16px',
                }}>
                  {config.brandName.charAt(0) || 'B'}
                </div>
              )}
              <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>{config.brandName || 'Seu Negócio'}</h2>
              <p style={{ margin: 0, opacity: 0.9 }}>{config.welcomeText}</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: `linear-gradient(135deg, ${config.primaryColorHex} 0%, ${adjustColor(config.primaryColorHex, -30)} 100%)`,
            color: 'white',
            border: 'none',
            padding: '14px 32px',
            borderRadius: 10,
            fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer',
            fontSize: 15,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Salvando...' : '💾 Salvar Alterações'}
        </button>
        {saved && (
          <span style={{ color: '#10b981', fontWeight: 500 }}>✓ Salvo com sucesso!</span>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

