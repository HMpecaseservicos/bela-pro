'use client';

import { useEffect, useState } from 'react';

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}

export default function My2FAPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/two-factor/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function startSetup() {
    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/two-factor/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao iniciar configuração');
      }
      const data = await res.json();
      setSetupData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function enable2FA() {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/two-factor/enable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código inválido');
      }

      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setSetupData(null);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function disable2FA() {
    if (!disableCode) {
      setError('Digite o código para desabilitar');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/two-factor/disable`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: disableCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código inválido');
      }

      setShowDisableModal(false);
      setDisableCode('');
      setBackupCodes(null);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  async function regenerateBackupCodes() {
    if (!regenerateCode) {
      setError('Digite o código atual');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/two-factor/backup-codes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: regenerateCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Código inválido');
      }

      const data = await res.json();
      setBackupCodes(data.backupCodes);
      setShowRegenerateModal(false);
      setRegenerateCode('');
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  const cardStyle = {
    background: '#1e293b',
    borderRadius: 16,
    padding: 28,
    border: '1px solid #334155',
    marginBottom: 24,
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#f8fafc',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center' as const,
    letterSpacing: '0.5em',
    outline: 'none',
  };

  const buttonStyle = (primary = true) => ({
    padding: '14px 28px',
    background: primary
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : '#334155',
    border: 'none',
    borderRadius: 10,
    color: 'white',
    fontWeight: 700 as const,
    fontSize: 14,
    cursor: processing ? 'default' : 'pointer',
    opacity: processing ? 0.6 : 1,
  });

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <div style={{
          width: 40,
          height: 40,
          margin: '0 auto 16px',
          border: '3px solid #334155',
          borderTopColor: '#10b981',
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
          🔐 Autenticação de Dois Fatores (2FA)
        </h1>
        <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
          Configure a autenticação de dois fatores para sua conta de Super Admin
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 16,
          background: '#7f1d1d',
          borderRadius: 10,
          marginBottom: 24,
          border: '1px solid #dc2626',
        }}>
          <p style={{ margin: 0, color: '#fecaca' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Status Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: status?.enabled ? '#064e3b' : '#7f1d1d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}>
            {status?.enabled ? '✅' : '❌'}
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 20 }}>
              Status: {status?.enabled ? 'Habilitado' : 'Desabilitado'}
            </h3>
            {status?.enabled && (
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
                Códigos de backup restantes: {status.backupCodesRemaining}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Backup Codes Display (after enabling or regenerating) */}
      {backupCodes && (
        <div style={{
          ...cardStyle,
          background: '#064e3b',
          border: '1px solid #10b981',
        }}>
          <h3 style={{ margin: '0 0 16px', color: '#6ee7b7', fontSize: 18 }}>
            🔑 Códigos de Backup
          </h3>
          <p style={{ margin: '0 0 16px', color: '#a7f3d0', fontSize: 13 }}>
            <strong>IMPORTANTE:</strong> Guarde esses códigos em um local seguro. Cada código só pode ser usado uma vez.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
            marginBottom: 16,
          }}>
            {backupCodes.map((code, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: '#0f172a',
                borderRadius: 8,
                fontFamily: 'monospace',
                fontSize: 14,
                color: '#f8fafc',
                textAlign: 'center',
              }}>
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join('\n'));
              alert('Códigos copiados!');
            }}
            style={buttonStyle(false)}
          >
            📋 Copiar Códigos
          </button>
        </div>
      )}

      {/* Not enabled - Show setup or start button */}
      {!status?.enabled && !setupData && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 18 }}>
            📱 Configurar 2FA
          </h3>
          <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 14 }}>
            A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta.
            Você precisará de um aplicativo autenticador como Google Authenticator, Authy ou 1Password.
          </p>
          <button onClick={startSetup} disabled={processing} style={buttonStyle()}>
            {processing ? 'Iniciando...' : '🚀 Iniciar Configuração'}
          </button>
        </div>
      )}

      {/* Setup Flow */}
      {setupData && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 18 }}>
            📱 Escaneie o QR Code
          </h3>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {/* QR Code */}
            <div style={{
              padding: 16,
              background: 'white',
              borderRadius: 12,
              display: 'inline-block',
            }}>
              <img
                src={setupData.qrCodeUrl}
                alt="QR Code 2FA"
                width={200}
                height={200}
                style={{ display: 'block' }}
              />
            </div>

            {/* Instructions */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 14, lineHeight: 2 }}>
                <li>Abra seu aplicativo autenticador</li>
                <li>Escaneie o QR Code ou digite a chave manualmente</li>
                <li>Digite o código de 6 dígitos abaixo</li>
              </ol>

              <div style={{ marginTop: 20 }}>
                <label style={{ display: 'block', color: '#64748b', fontSize: 12, marginBottom: 8 }}>
                  Chave manual (se não puder escanear):
                </label>
                <div style={{
                  padding: '12px 16px',
                  background: '#0f172a',
                  borderRadius: 8,
                  fontFamily: 'monospace',
                  fontSize: 14,
                  color: '#f59e0b',
                  wordBreak: 'break-all',
                }}>
                  {setupData.secret}
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                  Código de Verificação:
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={inputStyle}
                  maxLength={6}
                />
              </div>

              <button
                onClick={enable2FA}
                disabled={processing || verificationCode.length !== 6}
                style={{
                  ...buttonStyle(),
                  marginTop: 16,
                  opacity: verificationCode.length !== 6 ? 0.5 : 1,
                }}
              >
                {processing ? 'Verificando...' : '✅ Verificar e Habilitar 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enabled - Management Options */}
      {status?.enabled && !setupData && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 20px', color: '#f8fafc', fontSize: 18 }}>
            ⚙️ Gerenciar 2FA
          </h3>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowRegenerateModal(true)}
              style={buttonStyle(false)}
            >
              🔄 Regenerar Códigos de Backup
            </button>
            <button
              onClick={() => setShowDisableModal(true)}
              style={{
                ...buttonStyle(false),
                background: '#7f1d1d',
              }}
            >
              ❌ Desabilitar 2FA
            </button>
          </div>
        </div>
      )}

      {/* Regenerate Backup Codes Modal */}
      {showRegenerateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            ...cardStyle,
            maxWidth: 400,
            margin: 20,
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 18 }}>
              🔄 Regenerar Códigos de Backup
            </h3>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
              Digite o código atual do seu autenticador para gerar novos códigos de backup:
            </p>
            <input
              type="text"
              value={regenerateCode}
              onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              style={inputStyle}
              maxLength={6}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => setShowRegenerateModal(false)} style={buttonStyle(false)}>
                Cancelar
              </button>
              <button onClick={regenerateBackupCodes} disabled={processing} style={buttonStyle()}>
                {processing ? 'Gerando...' : 'Regenerar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            ...cardStyle,
            maxWidth: 400,
            margin: 20,
            borderColor: '#dc2626',
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#fecaca', fontSize: 18 }}>
              ⚠️ Desabilitar 2FA
            </h3>
            <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
              Isso removerá a proteção extra da sua conta. Digite um código do autenticador ou código de backup:
            </p>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 9))}
              placeholder="Código"
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => setShowDisableModal(false)} style={buttonStyle(false)}>
                Cancelar
              </button>
              <button
                onClick={disable2FA}
                disabled={processing}
                style={{
                  ...buttonStyle(),
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                }}
              >
                {processing ? 'Desabilitando...' : 'Desabilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
