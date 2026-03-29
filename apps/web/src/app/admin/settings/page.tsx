'use client';

import { useEffect, useState } from 'react';

interface SystemSetting {
  key: string;
  value: string;
  category: string;
}

interface AccessLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'logs'>('general');

  // General settings
  const [siteName, setSiteName] = useState('BELA PRO');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportWhatsApp, setSupportWhatsApp] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Security settings
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [ipWhitelist, setIpWhitelist] = useState('');

  // Email settings
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [emailFrom, setEmailFrom] = useState('');

  // Access logs
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAccessLogs();
    }
  }, [activeTab, logsPage]);

  async function fetchSettings() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Populate settings
        setSiteName(data['system.site_name'] || 'BELA PRO');
        setSupportEmail(data['system.support_email'] || '');
        setSupportWhatsApp(data['system.support_whatsapp'] || '');
        setMaintenanceMode(data['system.maintenance_mode'] === 'true');
        setRequire2FA(data['security.require_2fa'] === 'true');
        setSessionTimeout(data['security.session_timeout'] || '60');
        setMaxLoginAttempts(data['security.max_login_attempts'] || '5');
        setIpWhitelist(data['security.ip_whitelist'] || '');
        setSmtpHost(data['email.smtp_host'] || '');
        setSmtpPort(data['email.smtp_port'] || '587');
        setSmtpUser(data['email.smtp_user'] || '');
        setEmailFrom(data['email.from'] || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccessLogs() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/audit-logs?page=${logsPage}&limit=20&action=LOGIN`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccessLogs(data.items || data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function saveSettings(category: string) {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let settings: Record<string, string> = {};

      if (category === 'general') {
        settings = {
          'system.site_name': siteName,
          'system.support_email': supportEmail,
          'system.support_whatsapp': supportWhatsApp,
          'system.maintenance_mode': maintenanceMode.toString(),
        };
      } else if (category === 'security') {
        settings = {
          'security.require_2fa': require2FA.toString(),
          'security.session_timeout': sessionTimeout,
          'security.max_login_attempts': maxLoginAttempts,
          'security.ip_whitelist': ipWhitelist,
        };
      } else if (category === 'email') {
        settings = {
          'email.smtp_host': smtpHost,
          'email.smtp_port': smtpPort,
          'email.smtp_user': smtpUser,
          'email.from': emailFrom,
        };
        if (smtpPassword) {
          settings['email.smtp_password'] = smtpPassword;
        }
      }

      const res = await fetch(`${API_URL}/billing/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: 500 as const,
  };

  const tabStyle = (active: boolean) => ({
    padding: '12px 24px',
    background: active ? '#334155' : 'transparent',
    border: 'none',
    borderRadius: 8,
    color: active ? '#f8fafc' : '#64748b',
    fontSize: 14,
    fontWeight: 600 as const,
    cursor: 'pointer',
  });

  const cardStyle = {
    background: '#1e293b',
    borderRadius: 16,
    padding: 28,
    border: '1px solid #334155',
    marginBottom: 24,
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: 40,
          height: 40,
          margin: '0 auto 16px',
          border: '3px solid #334155',
          borderTopColor: '#f59e0b',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        Carregando...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
          ⚙️ Configurações do Sistema
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Gerencie as configurações globais da plataforma
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('general')} style={tabStyle(activeTab === 'general')}>
          🏠 Geral
        </button>
        <button onClick={() => setActiveTab('security')} style={tabStyle(activeTab === 'security')}>
          🔒 Segurança
        </button>
        <button onClick={() => setActiveTab('email')} style={tabStyle(activeTab === 'email')}>
          📧 Email
        </button>
        <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>
          📋 Logs de Acesso
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18 }}>
            🏠 Configurações Gerais
          </h3>

          <div style={{ display: 'grid', gap: 20, maxWidth: 600 }}>
            <div>
              <label style={labelStyle}>Nome do Sistema</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                style={inputStyle}
                placeholder="BELA PRO"
              />
            </div>

            <div>
              <label style={labelStyle}>Email de Suporte</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                style={inputStyle}
                placeholder="suporte@belapro.com"
              />
            </div>

            <div>
              <label style={labelStyle}>WhatsApp de Suporte</label>
              <input
                type="text"
                value={supportWhatsApp}
                onChange={(e) => setSupportWhatsApp(e.target.value)}
                style={inputStyle}
                placeholder="+5511999999999"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="maintenance"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#f59e0b' }}
              />
              <label htmlFor="maintenance" style={{ color: '#f8fafc', cursor: 'pointer' }}>
                Modo de Manutenção
              </label>
            </div>

            {maintenanceMode && (
              <div style={{
                padding: 16,
                background: '#7f1d1d',
                borderRadius: 10,
                border: '1px solid #dc2626',
              }}>
                <p style={{ margin: 0, color: '#fecaca', fontSize: 13 }}>
                  ⚠️ <strong>Atenção:</strong> Com o modo de manutenção ativo, apenas Super Admins poderão acessar o sistema.
                </p>
              </div>
            )}

            <button
              onClick={() => saveSettings('general')}
              disabled={saving}
              style={{
                padding: '14px 28px',
                background: saving ? '#334155' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: 10,
                color: saving ? '#64748b' : '#0f172a',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'default' : 'pointer',
                width: 'fit-content',
              }}
            >
              {saving ? 'Salvando...' : '💾 Salvar Configurações Gerais'}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18 }}>
            🔒 Configurações de Segurança
          </h3>

          <div style={{ display: 'grid', gap: 20, maxWidth: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="checkbox"
                id="require2fa"
                checked={require2FA}
                onChange={(e) => setRequire2FA(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: '#10b981' }}
              />
              <label htmlFor="require2fa" style={{ color: '#f8fafc', cursor: 'pointer' }}>
                Exigir 2FA para Super Admins
              </label>
            </div>

            <div>
              <label style={labelStyle}>Timeout da Sessão (minutos)</label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                style={inputStyle}
                min="15"
                max="1440"
              />
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                Tempo de inatividade antes de exigir login novamente (15-1440 min)
              </p>
            </div>

            <div>
              <label style={labelStyle}>Máximo de Tentativas de Login</label>
              <input
                type="number"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                style={inputStyle}
                min="3"
                max="10"
              />
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                Após esse número de tentativas falhas, a conta será bloqueada temporariamente
              </p>
            </div>

            <div>
              <label style={labelStyle}>IP Whitelist (Super Admin)</label>
              <textarea
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                placeholder="Um IP por linha&#10;ex: 192.168.1.1&#10;    10.0.0.0/24"
              />
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                Deixe em branco para permitir qualquer IP. Suporta CIDR notation.
              </p>
            </div>

            <div style={{
              padding: 16,
              background: '#064e3b',
              borderRadius: 10,
              border: '1px solid #10b981',
            }}>
              <p style={{ margin: 0, color: '#6ee7b7', fontSize: 13 }}>
                🔐 <strong>Dica:</strong> Habilitar 2FA para Super Admins aumenta significativamente a segurança do sistema.
              </p>
            </div>

            <button
              onClick={() => saveSettings('security')}
              disabled={saving}
              style={{
                padding: '14px 28px',
                background: saving ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'default' : 'pointer',
                width: 'fit-content',
              }}
            >
              {saving ? 'Salvando...' : '💾 Salvar Configurações de Segurança'}
            </button>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 24px', color: '#f8fafc', fontSize: 18 }}>
            📧 Configurações de Email (SMTP)
          </h3>

          <div style={{ display: 'grid', gap: 20, maxWidth: 600 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Servidor SMTP</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  style={inputStyle}
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Porta</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  style={inputStyle}
                  placeholder="587"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Usuário SMTP</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                style={inputStyle}
                placeholder="seu-email@gmail.com"
              />
            </div>

            <div>
              <label style={labelStyle}>Senha SMTP</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
              <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 12 }}>
                Deixe em branco para manter a senha atual
              </p>
            </div>

            <div>
              <label style={labelStyle}>Email de Origem (From)</label>
              <input
                type="email"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                style={inputStyle}
                placeholder="noreply@belapro.com"
              />
            </div>

            <button
              onClick={() => saveSettings('email')}
              disabled={saving}
              style={{
                padding: '14px 28px',
                background: saving ? '#334155' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'default' : 'pointer',
                width: 'fit-content',
              }}
            >
              {saving ? 'Salvando...' : '💾 Salvar Configurações de Email'}
            </button>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 18 }}>
              📋 Logs de Acesso
            </h3>
            <button
              onClick={fetchAccessLogs}
              style={{
                padding: '8px 16px',
                background: '#334155',
                border: 'none',
                borderRadius: 8,
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🔄 Atualizar
            </button>
          </div>

          {accessLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p>Nenhum log de acesso encontrado</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>DATA/HORA</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>USUÁRIO</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>AÇÃO</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>IP</th>
                    <th style={{ padding: 12, textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>NAVEGADOR</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: 12, color: '#f8fafc', fontSize: 13 }}>
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ color: '#f8fafc', fontSize: 13 }}>{log.userName || 'N/A'}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{log.userEmail}</div>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: log.action === 'LOGIN' ? '#064e3b' : '#7f1d1d',
                          color: log.action === 'LOGIN' ? '#6ee7b7' : '#fecaca',
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: 12, color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>
                        {log.ip || 'N/A'}
                      </td>
                      <td style={{ padding: 12, color: '#64748b', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.userAgent || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
              disabled={logsPage === 1}
              style={{
                padding: '8px 16px',
                background: logsPage === 1 ? '#1e293b' : '#334155',
                border: 'none',
                borderRadius: 8,
                color: logsPage === 1 ? '#4b5563' : '#f8fafc',
                cursor: logsPage === 1 ? 'default' : 'pointer',
              }}
            >
              ← Anterior
            </button>
            <span style={{ padding: '8px 16px', color: '#94a3b8' }}>Página {logsPage}</span>
            <button
              onClick={() => setLogsPage((p) => p + 1)}
              disabled={accessLogs.length < 20}
              style={{
                padding: '8px 16px',
                background: accessLogs.length < 20 ? '#1e293b' : '#334155',
                border: 'none',
                borderRadius: 8,
                color: accessLogs.length < 20 ? '#4b5563' : '#f8fafc',
                cursor: accessLogs.length < 20 ? 'default' : 'pointer',
              }}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
