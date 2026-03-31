'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  CircleDollarSign,
  Clock3,
  UserRound,
  Palette,
  Settings,
  Menu,
  X,
  Tags,
  ShoppingBag,
  ClipboardList,
  Star,
  type LucideIcon,
} from 'lucide-react';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { NotificationToggle } from '@/components/NotificationToggle';

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  goldLight: '#d4bc8a',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  sidebar: 'linear-gradient(180deg, #6a5846 0%, #544230 56%, #443528 100%)',
  sidebarText: '#f1e7d9',
  textPrimary: '#2f2a24',
  textSecondary: '#6e6256',
  textMuted: '#9b8e81',
  borderSubtle: '#e4dbcf',
};

const menuItems = [
  { href: '/dashboard', label: 'Visao do Negocio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/servicos', label: 'Servicos', icon: Scissors },
  { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingBag },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/dashboard/categorias', label: 'Categorias', icon: Tags },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { href: '/dashboard/horarios', label: 'Horarios', icon: Clock3 },
  { href: '/dashboard/equipe', label: 'Equipe', icon: UserRound },
  { href: '/dashboard/aparencia', label: 'Aparencia', icon: Palette },
  { href: '/dashboard/depoimentos', label: 'Depoimentos', icon: Star },
  { href: '/dashboard/config', label: 'Configuracoes', icon: Settings },
];

// Itens principais para o bottom nav (5 máximo - padrão de apps)
const bottomNavItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: CircleDollarSign },
];

// Itens do menu "Mais"
const moreMenuItems = [
  { href: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { href: '/dashboard/produtos', label: 'Produtos', icon: ShoppingBag },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/dashboard/categorias', label: 'Categorias', icon: Tags },
  { href: '/dashboard/horarios', label: 'Horários', icon: Clock3 },
  { href: '/dashboard/equipe', label: 'Equipe', icon: UserRound },
  { href: '/dashboard/aparencia', label: 'Aparência', icon: Palette },
  { href: '/dashboard/depoimentos', label: 'Depoimentos', icon: Star },
  { href: '/dashboard/config', label: 'Configurações', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setUserName(localStorage.getItem('userName') || 'Admin');

    // Carregar shopEnabled do workspace
    fetch(`${API_URL}/workspace/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(ws => { if (ws?.shopEnabled) setShopEnabled(true); })
      .catch(() => {});

    const checkMobile = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

  // Fechar menu "Mais" ao mudar de página
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);

  async function logout() {
    localStorage.clear();
    sessionStorage.clear();

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const shopPaths = ['/dashboard/produtos', '/dashboard/pedidos'];
  const filteredMenuItems = shopEnabled
    ? menuItems
    : menuItems.filter(i => !shopPaths.includes(i.href));
  const filteredMoreMenuItems = shopEnabled
    ? moreMenuItems
    : moreMenuItems.filter(i => !shopPaths.includes(i.href));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: THEME.page }}>
      {/* Sidebar Desktop Only */}
      {!isMobile && (
        <aside
          style={{
            width: 272,
            background: THEME.sidebar,
            color: THEME.sidebarText,
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            height: '100vh',
            zIndex: 100,
            boxShadow: '8px 0 22px rgba(41, 30, 20, 0.28)',
          }}
        >
        <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(236, 210, 171, 0.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/logo.png"
              alt="BELA PRO"
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600,
                  fontSize: 20,
                  color: THEME.goldSoft,
                  lineHeight: 1.1,
                }}
              >
                BELA PRO
              </div>
              <WorkspaceSwitcher />
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          {filteredMenuItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon as LucideIcon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 14px',
                    marginBottom: 5,
                    borderRadius: 12,
                    border: active ? '1px solid rgba(236, 205, 157, 0.58)' : '1px solid transparent',
                    background: active ? 'rgba(245, 214, 164, 0.2)' : 'transparent',
                    color: active ? '#fff6e8' : 'rgba(246, 237, 225, 0.74)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: '0.01em',
                  }}
                >
                  <span
                    style={{
                      color: active ? '#f5d7a4' : 'rgba(246, 237, 225, 0.56)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: active ? 'drop-shadow(0 0 4px rgba(245, 215, 164, 0.35))' : 'none',
                    }}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid rgba(236, 210, 171, 0.28)' }}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(241, 231, 217, 0.66)' }}>Notificacoes</span>
            <NotificationToggle />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                background: 'linear-gradient(135deg, #c9a66b 0%, #a07a45 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#241c13',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f5ecdf', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(241, 231, 217, 0.66)' }}>Administrador</div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(246, 220, 178, 0.2)',
              border: '1px solid rgba(246, 220, 178, 0.34)',
              borderRadius: 10,
              color: '#fae3bf',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
        </aside>
      )}

      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 272,
          minHeight: '100vh',
          background: THEME.page,
          paddingBottom: isMobile ? 80 : 0, // Espaço para o bottom nav
        }}
      >
        {isMobile && (
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              background: 'rgba(251, 248, 243, 0.94)',
              borderBottom: `1px solid ${THEME.borderSubtle}`,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="font-display" style={{ fontSize: 20, color: THEME.gold, lineHeight: 1, fontWeight: 600 }}>
              BELA PRO
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotificationToggle />
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c9a66b 0%, #a07a45 100%)',
                  color: '#241c13',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
        )}

        {children}
      </main>

      {/* ============ BOTTOM NAVIGATION (Mobile) ============ */}
      {isMobile && (
        <>
          {/* Overlay do menu "Mais" */}
          {moreMenuOpen && (
            <div
              onClick={() => setMoreMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 998,
              }}
            />
          )}

          {/* Menu "Mais" expandido */}
          {moreMenuOpen && (
            <div
              style={{
                position: 'fixed',
                bottom: 72,
                left: 12,
                right: 12,
                background: '#fff',
                borderRadius: 16,
                boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                zIndex: 999,
                padding: 8,
                animation: 'slideUp 0.2s ease',
              }}
            >
              <style>{`
                @keyframes slideUp {
                  from { opacity: 0; transform: translateY(20px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px 12px',
                borderBottom: `1px solid ${THEME.borderSubtle}`,
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: THEME.textPrimary }}>Mais opções</span>
                <button
                  onClick={() => setMoreMenuOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color={THEME.textMuted} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {filteredMoreMenuItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon as LucideIcon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{ textDecoration: 'none' }}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '14px 8px',
                          borderRadius: 12,
                          background: active ? `rgba(160, 122, 69, 0.1)` : 'transparent',
                        }}
                      >
                        <Icon 
                          size={22} 
                          color={active ? THEME.gold : THEME.textMuted}
                          strokeWidth={active ? 2.5 : 2}
                        />
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: active ? 600 : 500,
                          color: active ? THEME.gold : THEME.textSecondary,
                          textAlign: 'center',
                        }}>
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Botão Sair */}
              <div style={{ 
                borderTop: `1px solid ${THEME.borderSubtle}`,
                marginTop: 8,
                paddingTop: 8,
              }}>
                <button
                  onClick={logout}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(201, 117, 108, 0.1)',
                    border: '1px solid rgba(201, 117, 108, 0.2)',
                    borderRadius: 10,
                    color: '#c9756c',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  Sair da conta
                </button>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <nav
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: 68,
              background: '#fff',
              borderTop: `1px solid ${THEME.borderSubtle}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              zIndex: 997,
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
            }}
          >
            {bottomNavItems.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon as LucideIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ textDecoration: 'none', flex: 1 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 4px',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 14,
                        background: active ? `rgba(160, 122, 69, 0.15)` : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s',
                      }}
                    >
                      <Icon 
                        size={22} 
                        color={active ? THEME.gold : THEME.textMuted}
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: active ? 600 : 500,
                        color: active ? THEME.gold : THEME.textMuted,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Botão "Mais" */}
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 4px',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 28,
                    borderRadius: 14,
                    background: moreMenuOpen ? `rgba(160, 122, 69, 0.15)` : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                >
                  <Menu 
                    size={22} 
                    color={moreMenuOpen ? THEME.gold : THEME.textMuted}
                    strokeWidth={moreMenuOpen ? 2.5 : 2}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: moreMenuOpen ? 600 : 500,
                    color: moreMenuOpen ? THEME.gold : THEME.textMuted,
                    letterSpacing: '0.01em',
                  }}
                >
                  Mais
                </span>
              </div>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
