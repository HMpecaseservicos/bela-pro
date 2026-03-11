'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DIAMOND THEME
// =============================================================================

const C = {
  bg: '#050505',
  bgCard: '#0d0d0f',
  bgCard2: '#111114',
  bgHover: '#18181c',
  gold: '#c9a55c',
  goldLight: '#e2c97e',
  goldDim: '#8b7340',
  diamond: '#a78bfa',
  diamondLight: '#c4b5fd',
  diamondDark: '#7c3aed',
  textPrimary: '#f5f1eb',
  textSecondary: '#a09890',
  textMuted: '#6b6560',
  border: '#1e1e22',
  borderLight: '#2a2a30',
  success: '#34d399',
  successBg: '#34d39915',
  danger: '#f87171',
  dangerBg: '#f8717115',
  info: '#60a5fa',
  infoBg: '#60a5fa15',
  white: '#ffffff',
};

const FONT = {
  serif: 'Playfair Display, Georgia, serif',
  sans: 'Inter, -apple-system, sans-serif',
};

// =============================================================================
// TYPES
// =============================================================================

interface SponsorProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  tier: string;
  sponsorType: string;
  email?: string;
  contractStartsAt?: string;
  contractEndsAt?: string;
  recentPosts: SponsorPost[];
}

interface SponsorStats {
  brand: { views: number; clicks: number; ctr: number; lastViewedAt?: string; lastClickedAt?: string };
  posts: { total: number; active: number; views: number; clicks: number; ctr: number };
  contract: { active: boolean; daysLeft: number | null; startsAt?: string; endsAt?: string };
}

interface SponsorPost {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isActive: boolean;
  publishedAt: string;
  expiresAt?: string;
  viewCount: number;
  clickCount: number;
  createdAt: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function DiamondDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<SponsorProfile | null>(null);
  const [stats, setStats] = useState<SponsorStats | null>(null);
  const [posts, setPosts] = useState<SponsorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'profile'>('overview');
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<SponsorPost | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const postImageRef = useRef<HTMLInputElement>(null);

  const emptyPostForm = { title: '', description: '', imageUrl: '', ctaLabel: '', ctaUrl: '', expiresAt: '' };
  const [postForm, setPostForm] = useState(emptyPostForm);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getToken = () => localStorage.getItem('sponsorToken') || '';

  const headers = useCallback(() => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }), []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sponsor-dashboard/profile`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.status === 401) { router.push('/parceiro/login'); return; }
      if (res.ok) setProfile(await res.json());
    } catch { /* ignore */ }
  }, [router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sponsor-dashboard/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sponsor-dashboard/posts`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setPosts(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/parceiro/login'); return; }
    Promise.all([fetchProfile(), fetchStats(), fetchPosts()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchStats, fetchPosts, router]);

  const handleUploadPostImage = async (file: File) => {
    setUploadingPostImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/upload/sponsor-image?category=post`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const baseUrl = API_URL.replace('/api/v1', '');
        setPostForm(prev => ({ ...prev, imageUrl: `${baseUrl}${data.url}` }));
        showToast('Imagem enviada!');
      }
    } catch { showToast('Erro ao enviar', 'error'); }
    finally { setUploadingPostImage(false); }
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingPost
      ? `${API_URL}/sponsor-dashboard/posts/${editingPost.id}`
      : `${API_URL}/sponsor-dashboard/posts`;

    try {
      const res = await fetch(url, {
        method: editingPost ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify({
          ...postForm,
          description: postForm.description || null,
          imageUrl: postForm.imageUrl || null,
          ctaLabel: postForm.ctaLabel || null,
          ctaUrl: postForm.ctaUrl || null,
          expiresAt: postForm.expiresAt ? new Date(postForm.expiresAt).toISOString() : null,
        }),
      });

      if (res.ok) {
        showToast(editingPost ? 'Postagem atualizada!' : 'Postagem criada!');
        setShowPostModal(false);
        setEditingPost(null);
        setPostForm(emptyPostForm);
        fetchPosts();
        fetchStats();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Erro ao salvar', 'error');
      }
    } catch { showToast('Erro de conexão', 'error'); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Excluir esta postagem?')) return;
    try {
      const res = await fetch(`${API_URL}/sponsor-dashboard/posts/${postId}`, {
        method: 'DELETE', headers: headers(),
      });
      if (res.ok) { showToast('Excluída!'); fetchPosts(); fetchStats(); }
    } catch { showToast('Erro', 'error'); }
  };

  const handleTogglePost = async (post: SponsorPost) => {
    try {
      const res = await fetch(`${API_URL}/sponsor-dashboard/posts/${post.id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ isActive: !post.isActive }),
      });
      if (res.ok) { showToast(post.isActive ? 'Desativado' : 'Ativado'); fetchPosts(); }
    } catch { showToast('Erro', 'error'); }
  };

  const openEditPost = (p: SponsorPost) => {
    setEditingPost(p);
    setPostForm({
      title: p.title, description: p.description || '',
      imageUrl: p.imageUrl || '', ctaLabel: p.ctaLabel || '', ctaUrl: p.ctaUrl || '',
      expiresAt: p.expiresAt ? p.expiresAt.split('T')[0] : '',
    });
    setShowPostModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sponsorToken');
    localStorage.removeItem('sponsorInfo');
    router.push('/parceiro/login');
  };

  // Styles
  const cardStyle: React.CSSProperties = {
    background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`,
    padding: 24, position: 'relative', overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: C.bg,
    border: `1.5px solid ${C.border}`, borderRadius: 10,
    color: C.textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '12px 24px', background: `linear-gradient(135deg, ${C.diamond}, ${C.diamondDark})`,
    color: C.white, border: 'none', borderRadius: 12, fontWeight: 700,
    cursor: 'pointer', fontSize: 14, boxShadow: `0 4px 16px ${C.diamond}30`,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 18px', background: C.bgCard2, color: C.textSecondary,
    border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 500,
    cursor: 'pointer', fontSize: 13,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.sans }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: 'pulse 2s infinite' }}>💎</div>
          <p style={{ color: C.diamond, fontSize: 14, fontWeight: 500 }}>Carregando painel Diamond...</p>
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT.sans, color: C.textPrimary }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '14px 24px',
          background: toast.type === 'success' ? C.successBg : C.dangerBg,
          color: toast.type === 'success' ? C.success : C.danger,
          borderRadius: 12, fontSize: 14, fontWeight: 600,
          border: `1px solid ${toast.type === 'success' ? C.success + '40' : C.danger + '40'}`,
          backdropFilter: 'blur(12px)',
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ========== HEADER ========== */}
      <header style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${C.bgCard}ee`,
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {profile?.logoLightUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logoLightUrl} alt={profile.name} style={{ height: 36, borderRadius: 8, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.diamond}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💎</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.textPrimary }}>{profile?.name}</div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase',
              color: C.diamond, marginTop: 1,
            }}>
              Diamond Partner
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {stats?.contract.daysLeft !== null && (
            <div style={{
              padding: '6px 14px', borderRadius: 8,
              background: stats?.contract.active ? C.successBg : C.dangerBg,
              border: `1px solid ${stats?.contract.active ? C.success + '30' : C.danger + '30'}`,
              fontSize: 11, fontWeight: 600,
              color: stats?.contract.active ? C.success : C.danger,
            }}>
              {stats?.contract.active
                ? `${stats.contract.daysLeft} dias restantes`
                : 'Contrato expirado'}
            </div>
          )}
          <button onClick={handleLogout} style={{ ...btnSecondary, padding: '8px 16px', fontSize: 12 }}>
            Sair
          </button>
        </div>
      </header>

      {/* ========== MAIN ========== */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, fontFamily: FONT.serif }}>
            Seu Painel Diamond
          </h1>
          <p style={{ color: C.textSecondary, marginTop: 4, fontSize: 14 }}>
            Acompanhe performance, gerencie postagens e maximize sua visibilidade
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: C.bgCard, borderRadius: 12, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
          {[
            { key: 'overview' as const, label: '📊 Visão Geral' },
            { key: 'posts' as const, label: '📝 Postagens', count: posts.length },
            { key: 'profile' as const, label: '⚙️ Perfil' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? `${C.diamond}15` : 'transparent',
              color: activeTab === tab.key ? C.diamond : C.textMuted,
              transition: 'all 0.2s',
            }}>
              {tab.label}
              {tab.count !== undefined && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === 'overview' && stats && (
          <>
            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Impressões', value: stats.brand.views.toLocaleString(), icon: '👁️', color: C.info, sub: 'Marca exibida' },
                { label: 'Cliques', value: stats.brand.clicks.toLocaleString(), icon: '🖱️', color: C.gold, sub: 'Na sua marca' },
                { label: 'CTR', value: `${stats.brand.ctr}%`, icon: '📈', color: C.success, sub: 'Taxa de conversão' },
                { label: 'Posts Ativos', value: stats.posts.active, icon: '📝', color: C.diamond, sub: `de ${stats.posts.total} total` },
                { label: 'Views Posts', value: stats.posts.views.toLocaleString(), icon: '👀', color: C.goldLight, sub: 'Nos seus anúncios' },
              ].map((m, i) => (
                <div key={i} style={{
                  ...cardStyle,
                  transition: 'border-color 0.2s, transform 0.2s',
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = m.color + '40'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                   onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${m.color}60, transparent)`, borderRadius: '16px 16px 0 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: m.color, fontFamily: FONT.serif }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Performance Chart Mockup */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
              <div style={cardStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.textPrimary }}>
                  📊 Performance da Marca
                </h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', height: 160, padding: '0 8px' }}>
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => {
                    const h = 30 + Math.random() * 100;
                    return (
                      <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{
                          height: h, borderRadius: '6px 6px 0 0',
                          background: `linear-gradient(180deg, ${C.diamond}80, ${C.diamond}30)`,
                          marginBottom: 8, transition: 'height 0.5s',
                        }} />
                        <span style={{ fontSize: 10, color: C.textMuted }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 16, justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: C.diamond, marginRight: 6 }} />
                    Impressões
                  </span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: C.gold, marginRight: 6 }} />
                    Cliques
                  </span>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.textPrimary }}>
                  🎯 Taxa de Conversão
                </h3>
                <div style={{ textAlign: 'center', paddingTop: 16 }}>
                  <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke={C.border} strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke={C.diamond} strokeWidth="10"
                        strokeDasharray={`${stats.brand.ctr * 3.14} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: C.diamond, fontFamily: FONT.serif }}>{stats.brand.ctr}%</span>
                    </div>
                  </div>
                  <p style={{ color: C.textMuted, fontSize: 11, marginTop: 12 }}>CTR geral da marca</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: C.textPrimary }}>
                ⚡ Atividade Recente
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.brand.lastViewedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.bgCard2, borderRadius: 10 }}>
                    <span style={{ fontSize: 16 }}>👁️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.textPrimary }}>Última impressão da marca</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(stats.brand.lastViewedAt).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                )}
                {stats.brand.lastClickedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.bgCard2, borderRadius: 10 }}>
                    <span style={{ fontSize: 16 }}>🖱️</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.textPrimary }}>Último clique na marca</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(stats.brand.lastClickedAt).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: C.bgCard2, borderRadius: 10 }}>
                  <span style={{ fontSize: 16 }}>📝</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.textPrimary }}>{stats.posts.active} postagens ativas</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{stats.posts.views.toLocaleString()} views total nas postagens</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========== POSTS TAB ========== */}
        {activeTab === 'posts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: C.textPrimary }}>
                  Suas Postagens & Anúncios
                </h2>
                <p style={{ color: C.textMuted, fontSize: 13, marginTop: 2 }}>
                  Gerencie seu conteúdo exibido na plataforma Bela Pro
                </p>
              </div>
              <button onClick={() => { setEditingPost(null); setPostForm(emptyPostForm); setShowPostModal(true); }} style={btnPrimary}>
                + Nova Postagem
              </button>
            </div>

            {posts.length === 0 ? (
              <div style={{
                ...cardStyle, textAlign: 'center', padding: 60,
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <h3 style={{ color: C.textPrimary, fontSize: 18, marginBottom: 6 }}>Nenhuma postagem ainda</h3>
                <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
                  Crie sua primeira postagem para aumentar a visibilidade da sua marca
                </p>
                <button onClick={() => { setEditingPost(null); setPostForm(emptyPostForm); setShowPostModal(true); }} style={btnPrimary}>
                  Criar Primeira Postagem
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {posts.map(post => (
                  <div key={post.id} style={{
                    ...cardStyle, transition: 'border-color 0.2s, transform 0.2s',
                    opacity: post.isActive ? 1 : 0.6,
                  }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.diamond + '40'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                     onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    {/* Post Image */}
                    {post.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.imageUrl} alt={post.title}
                        style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />
                    )}

                    {/* Status badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: post.isActive ? C.successBg : C.dangerBg,
                        color: post.isActive ? C.success : C.danger,
                        border: `1px solid ${post.isActive ? C.success + '30' : C.danger + '30'}`,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {post.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      {post.expiresAt && new Date(post.expiresAt) < new Date() && (
                        <span style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>Expirado</span>
                      )}
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: '0 0 6px 0' }}>{post.title}</h3>
                    {post.description && (
                      <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 14px 0', lineHeight: 1.4 }}>
                        {post.description.slice(0, 100)}{post.description.length > 100 ? '...' : ''}
                      </p>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.info }}>{post.viewCount.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>Views</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.gold }}>{post.clickCount.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>Cliques</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.success }}>
                          {post.viewCount > 0 ? ((post.clickCount / post.viewCount) * 100).toFixed(1) : '0'}%
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>CTR</div>
                      </div>
                    </div>

                    {/* CTA Link */}
                    {post.ctaUrl && (
                      <div style={{ fontSize: 12, color: C.diamond, marginBottom: 14 }}>
                        🔗 {post.ctaLabel || 'Ver mais'} → {post.ctaUrl.slice(0, 40)}...
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <button onClick={() => openEditPost(post)} style={{ ...btnSecondary, flex: 1, fontSize: 12 }}>✏️ Editar</button>
                      <button onClick={() => handleTogglePost(post)}
                        style={{ ...btnSecondary, padding: '8px 14px', fontSize: 12, color: post.isActive ? C.danger : C.success }}>
                        {post.isActive ? '⏸' : '▶️'}
                      </button>
                      <button onClick={() => handleDeletePost(post.id)}
                        style={{ ...btnSecondary, padding: '8px 14px', fontSize: 12, color: C.danger }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== PROFILE TAB ========== */}
        {activeTab === 'profile' && profile && (
          <div style={{ maxWidth: 640 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px 0', color: C.textPrimary }}>
              Perfil do Parceiro
            </h2>

            <div style={cardStyle}>
              {/* Cover */}
              {profile.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.coverImageUrl} alt="Capa"
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                {profile.logoLightUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.logoLightUrl} alt={profile.name}
                    style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain', background: C.bgCard2, padding: 8 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: `${C.diamond}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>💎</div>
                )}
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: FONT.serif }}>{profile.name}</h3>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: `${C.diamond}20`, color: C.diamond, marginTop: 4,
                  }}>
                    💎 Diamond Partner
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { label: 'Slug', value: profile.slug },
                  { label: 'Email', value: profile.email || '—' },
                  { label: 'Website', value: profile.websiteUrl || '—' },
                  { label: 'CTA', value: profile.ctaLabel ? `${profile.ctaLabel} → ${profile.ctaUrl}` : '—' },
                  { label: 'Contrato', value: profile.contractStartsAt
                    ? `${new Date(profile.contractStartsAt).toLocaleDateString('pt-BR')} → ${profile.contractEndsAt ? new Date(profile.contractEndsAt).toLocaleDateString('pt-BR') : '∞'}`
                    : '—' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.textMuted }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {profile.description && (
                <div style={{ marginTop: 16, padding: 14, background: C.bgCard2, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Descrição</div>
                  <p style={{ fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{profile.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========== POST MODAL ========== */}
      {showPostModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: '60px 16px', overflowY: 'auto', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: C.bgCard, borderRadius: 20, width: '100%', maxWidth: 560,
            padding: 32, position: 'relative', border: `1px solid ${C.border}`,
            boxShadow: `0 0 60px ${C.diamond}10`,
          }}>
            <button onClick={() => { setShowPostModal(false); setEditingPost(null); }} style={{
              position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
              fontSize: 22, cursor: 'pointer', color: C.textMuted, padding: 4,
            }}>✕</button>

            <h2 style={{ color: C.textPrimary, marginBottom: 4, fontFamily: FONT.serif, fontSize: 22 }}>
              {editingPost ? '✏️ Editar Postagem' : '📝 Nova Postagem'}
            </h2>
            <p style={{ color: C.textMuted, marginBottom: 20, fontSize: 13 }}>
              {editingPost ? 'Atualize sua postagem' : 'Crie uma nova postagem para exibir na plataforma'}
            </p>

            <form onSubmit={handleSavePost}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Título *</label>
                  <input type="text" required value={postForm.title}
                    onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                    placeholder="Título da postagem" style={inputStyle} />
                </div>

                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Descrição</label>
                  <textarea value={postForm.description}
                    onChange={e => setPostForm({ ...postForm, description: e.target.value })}
                    rows={3} placeholder="Descreva sua postagem..."
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                {/* Image Upload */}
                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Imagem</label>
                  <input ref={postImageRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPostImage(f); }} />
                  <div style={{
                    border: `2px dashed ${postForm.imageUrl ? C.diamond + '60' : C.border}`,
                    borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer',
                    background: postForm.imageUrl ? `${C.diamond}08` : C.bg,
                    minHeight: 100, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 8, position: 'relative',
                  }} onClick={() => postImageRef.current?.click()}>
                    {uploadingPostImage ? (
                      <span style={{ fontSize: 13, color: C.diamond }}>Enviando...</span>
                    ) : postForm.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={postForm.imageUrl} alt="Preview"
                          style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }} />
                        <span style={{ fontSize: 11, color: C.textMuted }}>Clique para trocar</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 28 }}>📁</span>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Clique para upload da imagem</span>
                      </>
                    )}
                    {postForm.imageUrl && (
                      <button type="button" onClick={e => { e.stopPropagation(); setPostForm(prev => ({ ...prev, imageUrl: '' })); }}
                        style={{ position: 'absolute', top: 6, right: 6, background: C.dangerBg, border: 'none',
                          borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 11, color: C.danger, lineHeight: '22px' }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>CTA Label</label>
                    <input type="text" value={postForm.ctaLabel}
                      onChange={e => setPostForm({ ...postForm, ctaLabel: e.target.value })}
                      placeholder="Saiba mais" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>CTA URL</label>
                    <input type="url" value={postForm.ctaUrl}
                      onChange={e => setPostForm({ ...postForm, ctaUrl: e.target.value })}
                      placeholder="https://..." style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' }}>Expira em</label>
                  <input type="date" value={postForm.expiresAt}
                    onChange={e => setPostForm({ ...postForm, expiresAt: e.target.value })}
                    style={{ ...inputStyle, maxWidth: 200 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => { setShowPostModal(false); setEditingPost(null); }} style={btnSecondary}>Cancelar</button>
                <button type="submit" style={btnPrimary}>
                  {editingPost ? 'Salvar Alterações' : '📝 Criar Postagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${C.textMuted}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>
    </div>
  );
}
