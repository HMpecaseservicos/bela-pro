'use client';

import { useEffect, useState } from 'react';

interface Plan {
  id: string;
  name: string;
  description?: string;
  priceMonthly: number;
  priceQuarterly?: number;
  priceSemiannual?: number;
  priceAnnual?: number;
  maxAppointments?: number;
  maxClients?: number;
  maxTeamMembers?: number;
  chatbotEnabled: boolean;
  whatsappEnabled: boolean;
  financialEnabled: boolean;
  pixPaymentEnabled: boolean;
  features: string[];
  trialDays: number;
  isActive: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  _count?: { subscriptions: number };
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/billing/plans?includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao carregar planos');
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(plan: Plan) {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/billing/plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`Deseja desativar o plano "${plan.name}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/billing/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPlans();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function formatPrice(cents: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f8fafc' }}>
            Planos de Assinatura
          </h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 15 }}>
            Configure os planos disponíveis para os clientes
          </p>
        </div>
        <button
          onClick={() => { setEditingPlan(null); setShowModal(true); }}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: 10,
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ➕ Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          Carregando...
        </div>
      ) : plans.length === 0 ? (
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ color: '#94a3b8', marginBottom: 20 }}>Nenhum plano cadastrado</p>
          <button
            onClick={() => { setEditingPlan(null); setShowModal(true); }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Criar Primeiro Plano
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.isHighlighted 
                  ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                  : '#1e293b',
                borderRadius: 16,
                border: plan.isHighlighted 
                  ? '2px solid #f59e0b' 
                  : '1px solid #334155',
                overflow: 'hidden',
                opacity: plan.isActive ? 1 : 0.6,
                position: 'relative',
              }}
            >
              {/* Destacado badge */}
              {plan.isHighlighted && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: '#f59e0b',
                  color: '#0f172a',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                }}>
                  ⭐ RECOMENDADO
                </div>
              )}

              {/* Header */}
              <div style={{ padding: 24, borderBottom: '1px solid #334155' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: 20 }}>
                  {plan.name}
                </h3>
                {plan.description && (
                  <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13 }}>
                    {plan.description}
                  </p>
                )}
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>
                    {formatPrice(plan.priceMonthly)}
                  </span>
                  <span style={{ color: '#64748b', fontSize: 14 }}>/mês</span>
                </div>
                
                {/* Status */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    background: plan.isActive ? '#064e3b' : '#7f1d1d',
                    color: plan.isActive ? '#6ee7b7' : '#fecaca',
                  }}>
                    {plan.isActive ? '✓ Ativo' : '✗ Inativo'}
                  </span>
                  {plan._count && plan._count.subscriptions > 0 && (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: '#1e3a5f',
                      color: '#60a5fa',
                    }}>
                      {plan._count.subscriptions} assinantes
                    </span>
                  )}
                </div>
              </div>

              {/* Features */}
              <div style={{ padding: 24, minHeight: 160 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>
                  RECURSOS INCLUSOS:
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {plan.chatbotEnabled && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      ✅ Chatbot WhatsApp
                    </li>
                  )}
                  {plan.financialEnabled && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      ✅ Módulo Financeiro
                    </li>
                  )}
                  {plan.pixPaymentEnabled && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      ✅ Pagamento PIX
                    </li>
                  )}
                  {plan.maxAppointments && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      📅 Até {plan.maxAppointments} agendamentos/mês
                    </li>
                  )}
                  {plan.maxClients && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      👥 Até {plan.maxClients} clientes
                    </li>
                  )}
                  {plan.maxTeamMembers && (
                    <li style={{ marginBottom: 6, color: '#94a3b8', fontSize: 13 }}>
                      👔 Até {plan.maxTeamMembers} membros
                    </li>
                  )}
                  {plan.trialDays > 0 && (
                    <li style={{ marginBottom: 6, color: '#f59e0b', fontSize: 13 }}>
                      🎁 {plan.trialDays} dias grátis
                    </li>
                  )}
                </ul>
              </div>

              {/* Actions */}
              <div style={{
                padding: 16,
                borderTop: '1px solid #334155',
                display: 'flex',
                gap: 8,
              }}>
                <button
                  onClick={() => { setEditingPlan(plan); setShowModal(true); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: 8,
                    color: '#f8fafc',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  style={{
                    padding: '10px 14px',
                    background: plan.isActive ? '#7f1d1d' : '#064e3b',
                    border: 'none',
                    borderRadius: 8,
                    color: plan.isActive ? '#fecaca' : '#6ee7b7',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {plan.isActive ? '⏸️' : '▶️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PlanModal
          plan={editingPlan}
          apiUrl={API_URL}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchPlans(); }}
        />
      )}
    </div>
  );
}

// ==================== MODAL DE PLANO ====================

function PlanModal({ plan, apiUrl, onClose, onSaved }: {
  plan: Plan | null;
  apiUrl: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!plan;

  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [priceMonthly, setPriceMonthly] = useState(plan?.priceMonthly || 0);
  const [priceQuarterly, setPriceQuarterly] = useState(plan?.priceQuarterly || 0);
  const [priceSemiannual, setPriceSemiannual] = useState(plan?.priceSemiannual || 0);
  const [priceAnnual, setPriceAnnual] = useState(plan?.priceAnnual || 0);
  const [maxAppointments, setMaxAppointments] = useState<number | ''>(plan?.maxAppointments || '');
  const [maxClients, setMaxClients] = useState<number | ''>(plan?.maxClients || '');
  const [maxTeamMembers, setMaxTeamMembers] = useState<number | ''>(plan?.maxTeamMembers || '');
  const [chatbotEnabled, setChatbotEnabled] = useState(plan?.chatbotEnabled ?? true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(plan?.whatsappEnabled ?? true);
  const [financialEnabled, setFinancialEnabled] = useState(plan?.financialEnabled ?? true);
  const [pixPaymentEnabled, setPixPaymentEnabled] = useState(plan?.pixPaymentEnabled ?? true);
  const [trialDays, setTrialDays] = useState(plan?.trialDays ?? 7);
  const [isHighlighted, setIsHighlighted] = useState(plan?.isHighlighted ?? false);
  const [features, setFeatures] = useState<string[]>(plan?.features || []);
  const [newFeature, setNewFeature] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = isEditing 
        ? `${apiUrl}/billing/plans/${plan.id}`
        : `${apiUrl}/billing/plans`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          priceMonthly,
          priceQuarterly: priceQuarterly || undefined,
          priceSemiannual: priceSemiannual || undefined,
          priceAnnual: priceAnnual || undefined,
          maxAppointments: maxAppointments || null,
          maxClients: maxClients || null,
          maxTeamMembers: maxTeamMembers || null,
          chatbotEnabled,
          whatsappEnabled,
          financialEnabled,
          pixPaymentEnabled,
          trialDays,
          isHighlighted,
          features,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao salvar');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addFeature() {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  }

  function removeFeature(index: number) {
    setFeatures(features.filter((_, i) => i !== index));
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f8fafc',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 500 as const,
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'auto',
      padding: '40px 20px',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 16,
        width: 600,
        maxWidth: '100%',
        border: '1px solid #334155',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 20, fontWeight: 600 }}>
            {isEditing ? '✏️ Editar Plano' : '➕ Novo Plano'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Nome e Descrição */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nome do Plano *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Profissional"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição breve do plano"
              style={inputStyle}
            />
          </div>

          {/* Preços */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>💰 Preços (em centavos)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Mensal *</label>
                <input
                  type="number"
                  value={priceMonthly}
                  onChange={(e) => setPriceMonthly(parseInt(e.target.value) || 0)}
                  placeholder="9900"
                  required
                  min={0}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  = R$ {(priceMonthly / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Trimestral</label>
                <input
                  type="number"
                  value={priceQuarterly}
                  onChange={(e) => setPriceQuarterly(parseInt(e.target.value) || 0)}
                  placeholder="26900"
                  min={0}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  = R$ {(priceQuarterly / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Semestral</label>
                <input
                  type="number"
                  value={priceSemiannual}
                  onChange={(e) => setPriceSemiannual(parseInt(e.target.value) || 0)}
                  placeholder="49900"
                  min={0}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  = R$ {(priceSemiannual / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Anual</label>
                <input
                  type="number"
                  value={priceAnnual}
                  onChange={(e) => setPriceAnnual(parseInt(e.target.value) || 0)}
                  placeholder="89900"
                  min={0}
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  = R$ {(priceAnnual / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Limites */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>📊 Limites (deixe vazio para ilimitado)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Agendamentos/mês</label>
                <input
                  type="number"
                  value={maxAppointments}
                  onChange={(e) => setMaxAppointments(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="∞"
                  min={1}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Clientes</label>
                <input
                  type="number"
                  value={maxClients}
                  onChange={(e) => setMaxClients(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="∞"
                  min={1}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 11 }}>Membros equipe</label>
                <input
                  type="number"
                  value={maxTeamMembers}
                  onChange={(e) => setMaxTeamMembers(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="∞"
                  min={1}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Recursos */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>⚡ Recursos Inclusos</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { key: 'chatbot', label: 'Chatbot WhatsApp', value: chatbotEnabled, setValue: setChatbotEnabled },
                { key: 'whatsapp', label: 'WhatsApp Integração', value: whatsappEnabled, setValue: setWhatsappEnabled },
                { key: 'financial', label: 'Módulo Financeiro', value: financialEnabled, setValue: setFinancialEnabled },
                { key: 'pix', label: 'Pagamento PIX', value: pixPaymentEnabled, setValue: setPixPaymentEnabled },
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: item.value ? '#064e3b' : '#0f172a',
                    border: `1px solid ${item.value ? '#10b981' : '#334155'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.setValue(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span style={{ color: item.value ? '#6ee7b7' : '#94a3b8', fontSize: 13 }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Trial e Destacado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>🎁 Dias de Trial</label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min={0}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>⭐ Destacar Plano?</label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: isHighlighted ? '#78350f' : '#0f172a',
                  border: `1px solid ${isHighlighted ? '#f59e0b' : '#334155'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isHighlighted}
                  onChange={(e) => setIsHighlighted(e.target.checked)}
                  style={{ accentColor: '#f59e0b' }}
                />
                <span style={{ color: isHighlighted ? '#fbbf24' : '#94a3b8', fontSize: 13 }}>
                  Recomendado
                </span>
              </label>
            </div>
          </div>

          {/* Features personalizadas */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>✨ Recursos Extras (lista)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Ex: Suporte prioritário"
                style={{ ...inputStyle, flex: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <button
                type="button"
                onClick={addFeature}
                style={{
                  padding: '12px 16px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: 8,
                  color: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
            {features.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      background: '#334155',
                      borderRadius: 20,
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              background: '#7f1d1d',
              border: '1px solid #dc2626',
              borderRadius: 8,
              padding: 12,
              color: '#fecaca',
              fontSize: 13,
              marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: 14,
                background: '#334155',
                border: 'none',
                borderRadius: 10,
                color: '#f8fafc',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: 14,
                background: loading ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
