'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  const [form, setForm] = useState({
    // Step 1: Personal Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 2: Business Info
    businessName: '',
    businessSlug: '',
    phone: '',
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function handleBusinessNameChange(value: string) {
    setForm({
      ...form,
      businessName: value,
      businessSlug: generateSlug(value),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Step 1 validation
    if (step === 1) {
      if (!form.name || !form.email || !form.password) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }
      if (form.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('As senhas não conferem');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 validation and submit
    if (!form.businessName || !form.businessSlug) {
      setError('Preencha o nome do seu negócio');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          workspaceName: form.businessName,
          workspaceSlug: form.businessSlug,
          phone: form.phone || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao criar conta');
      }

      // SECURITY: Clear any previous session data before setting new
      localStorage.clear();
      sessionStorage.clear();

      // Auto login after registration
      if (data.access_token || data.accessToken) {
        const token = data.access_token || data.accessToken;
        localStorage.setItem('token', token);
        if (data.workspace?.id) {
          localStorage.setItem('workspaceId', data.workspace.id);
          localStorage.setItem('workspaceName', data.workspace.name);
        }
        if (data.user?.name) {
          localStorage.setItem('userName', data.user.name);
        }
        router.push('/dashboard');
      } else {
        // If no token, redirect to login
        router.push('/login?registered=true');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? 14 : 16,
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    fontSize: isMobile ? 15 : 16,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? 14 : 16,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: isMobile ? 15 : 16,
    fontWeight: 600,
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? 16 : 32,
    }}>
      <div style={{
        background: 'white',
        borderRadius: isMobile ? 16 : 24,
        padding: isMobile ? 24 : 40,
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 32 }}>
          <div style={{
            width: isMobile ? 56 : 72,
            height: isMobile ? 56 : 72,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: isMobile ? 28 : 36,
          }}>
            📅
          </div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#1a1a2e' }}>
            Crie sua Agenda Digital
          </h1>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: isMobile ? 13 : 15 }}>
            {step === 1 ? 'Primeiro, seus dados pessoais' : 'Agora, sobre seu negócio'}
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 24 : 32 }}>
          <div style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: '#667eea',
          }} />
          <div style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: step >= 2 ? '#667eea' : '#e5e7eb',
            transition: 'background 0.3s',
          }} />
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: isMobile ? 12 : 16,
            borderRadius: 12,
            marginBottom: isMobile ? 16 : 24,
            fontSize: isMobile ? 13 : 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  Seu nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Maria Silva"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  E-mail *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  Senha *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  Confirmar senha *
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  style={inputStyle}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  Nome do seu negócio *
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => handleBusinessNameChange(e.target.value)}
                  placeholder="Ex: Salão da Maria"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: isMobile ? 16 : 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  Link do seu agendamento
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <div style={{
                    background: '#f1f5f9',
                    padding: isMobile ? '14px 12px' : '16px 14px',
                    borderRadius: '12px 0 0 12px',
                    border: '2px solid #e5e7eb',
                    borderRight: 'none',
                    color: '#64748b',
                    fontSize: isMobile ? 13 : 14,
                    whiteSpace: 'nowrap',
                  }}>
                    {typeof window !== 'undefined' ? window.location.origin : ''}/
                  </div>
                  <input
                    type="text"
                    value={form.businessSlug}
                    onChange={e => setForm({ ...form, businessSlug: generateSlug(e.target.value) })}
                    placeholder="salao-da-maria"
                    style={{
                      ...inputStyle,
                      borderRadius: '0 12px 12px 0',
                    }}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: isMobile ? 11 : 12, color: '#94a3b8' }}>
                  Este será o link que seus clientes usarão para agendar
                </p>
              </div>

              <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: isMobile ? 13 : 14 }}>
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  style={inputStyle}
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  padding: isMobile ? 12 : 14,
                  background: 'transparent',
                  color: '#64748b',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                ← Voltar
              </button>
            </>
          )}

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? '⏳ Criando conta...' : step === 1 ? 'Continuar →' : '✨ Criar minha agenda'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: isMobile ? 20 : 24 }}>
          <p style={{ color: '#64748b', fontSize: isMobile ? 13 : 14 }}>
            Já tem uma conta?{' '}
            <a href="/login" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
              Fazer login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
