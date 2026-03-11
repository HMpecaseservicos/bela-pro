'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const C = {
  bg: '#050505',
  bgCard: '#0d0d0f',
  bgHover: '#141418',
  gold: '#c9a55c',
  goldLight: '#e2c97e',
  goldDim: '#8b7340',
  diamond: '#a78bfa',
  diamondLight: '#c4b5fd',
  textPrimary: '#f5f1eb',
  textSecondary: '#a09890',
  textMuted: '#6b6560',
  border: '#1e1e22',
  borderGold: '#c9a55c30',
  white: '#ffffff',
};

export default function SponsorLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/sponsor-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('sponsorToken', data.accessToken);
        localStorage.setItem('sponsorInfo', JSON.stringify(data.sponsor));
        router.push('/parceiro/dashboard');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Email ou senha incorretos');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient effects */}
      <div style={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600,
        background: `radial-gradient(circle, ${C.diamond}12, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', left: '20%',
        width: 400, height: 400,
        background: `radial-gradient(circle, ${C.gold}08, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72, borderRadius: 20,
            background: `linear-gradient(135deg, ${C.diamond}20, ${C.gold}15)`,
            border: `1px solid ${C.diamond}30`,
            marginBottom: 16, fontSize: 36,
          }}>
            💎
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: C.textPrimary, margin: 0,
            fontFamily: 'Playfair Display, Georgia, serif',
          }}>
            Diamond Panel
          </h1>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>
            Painel exclusivo para patrocinadores Diamond
          </p>
          <div style={{
            display: 'inline-block', marginTop: 10,
            padding: '4px 14px', borderRadius: 20,
            background: `${C.gold}12`, border: `1px solid ${C.gold}25`,
            fontSize: 11, fontWeight: 600, color: C.gold,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            Bela Pro · Parceiros
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: C.bgCard,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          padding: 36,
          boxShadow: `0 0 60px ${C.diamond}06, 0 20px 60px rgba(0,0,0,0.5)`,
        }}>
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 20,
              background: '#dc2626' + '15', border: '1px solid #dc262640',
              color: '#fca5a5', fontSize: 13, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Email
              </label>
              <input
                type="email" required autoFocus
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="sponsor@empresa.com"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: C.bg, border: `1.5px solid ${C.border}`,
                  borderRadius: 12, color: C.textPrimary, fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = C.diamond}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Senha
              </label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 16px',
                  background: C.bg, border: `1.5px solid ${C.border}`,
                  borderRadius: 12, color: C.textPrimary, fontSize: 15,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = C.diamond}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px 24px',
                background: loading
                  ? C.textMuted
                  : `linear-gradient(135deg, ${C.diamond}, #7c3aed)`,
                color: C.white, border: 'none', borderRadius: 14,
                fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer',
                letterSpacing: '0.3px',
                boxShadow: `0 4px 20px ${C.diamond}30`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 28px ${C.diamond}40`; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${C.diamond}30`; }}
            >
              {loading ? 'Entrando...' : '💎 Acessar Painel Diamond'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 28, color: C.textMuted, fontSize: 12 }}>
          Acesso exclusivo para patrocinadores tier Diamond.
          <br />
          Entre em contato com a Bela Pro para obter suas credenciais.
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.textMuted}; }
      `}</style>
    </div>
  );
}
