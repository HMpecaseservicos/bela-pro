'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { NotificationToggle } from '@/components/NotificationToggle';

// Paleta elegante
const THEME = {
  gold: '#9a7b4f',
  goldLight: '#c9a66c',
  goldHover: '#b8956b',
  bgCream: '#faf8f5',
  bgBeige: '#f5f0e8',
  textPrimary: '#3d3d3d',
  textSecondary: '#6b5b4f',
  textMuted: '#9a8b7a',
  borderLight: '#e8dfd3',
  sidebarBg: 'linear-gradient(180deg, #2c2620 0%, #1f1b17 100%)',
  sidebarText: '#e8dfd3',
};

const menuItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard', exact: true },
  { href: '/dashboard/agenda', icon: '📅', label: 'Agenda' },
  { href: '/dashboard/clientes', icon: '👥', label: 'Clientes' },
  { href: '/dashboard/servicos', icon: '✨', label: 'Serviços' },
  { href: '/dashboard/financeiro', icon: '💰', label: 'Financeiro' },
  { href: '/dashboard/horarios', icon: '🕐', label: 'Horários' },
  { href: '/dashboard/equipe', icon: '👤', label: 'Equipe' },
  { href: '/dashboard/aparencia', icon: '🎨', label: 'Aparência' },
  { href: '/dashboard/config', icon: '⚙️', label: 'Configurações' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setUserName(localStorage.getItem('userName') || 'Admin');

    // Detectar mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

  async function logout() {
    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear Service Worker cache
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      // Wait briefly for cache to clear
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear any cached data via Cache API directly
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

  function handleNavClick() {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: THEME.bgCream,
    }}>
      {/* Overlay para mobile */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(44, 38, 32, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 260,
        background: THEME.sidebarBg,
        color: THEME.sidebarText,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 100,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
      }}>
        {/* Logo */}
        <div style={{ padding: 20, borderBottom: `1px solid rgba(201, 166, 108, 0.15)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/logo.png" 
              alt="BELA PRO" 
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: THEME.goldLight, letterSpacing: '0.5px' }}>BELA PRO</div>
              <WorkspaceSwitcher />
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={handleNavClick}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  marginBottom: 4,
                  borderRadius: 10,
                  background: active ? 'rgba(201, 166, 108, 0.15)' : 'transparent',
                  color: active ? THEME.goldLight : 'rgba(232, 223, 211, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderLeft: active ? `3px solid ${THEME.goldLight}` : '3px solid transparent',
                }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, letterSpacing: '0.3px' }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: 16, borderTop: `1px solid rgba(201, 166, 108, 0.15)` }}>
          {/* Notificações */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(232, 223, 211, 0.5)' }}>Notificações:</span>
            <NotificationToggle />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${THEME.goldLight} 0%, ${THEME.gold} 100%)`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#1f1b17',
              flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>Administrador</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(201, 166, 108, 0.1)',
              border: `1px solid rgba(201, 166, 108, 0.2)`,
              borderRadius: 8,
              color: THEME.goldLight,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 260,
        background: THEME.bgCream,
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Mobile Header */}
        {isMobile && (
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: THEME.sidebarBg,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'rgba(201, 166, 108, 0.15)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" fill="none" stroke={THEME.goldLight} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32,
                height: 32,
                background: `linear-gradient(135deg, ${THEME.goldLight} 0%, ${THEME.gold} 100%)`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#1f1b17',
              }}>B</div>
              <span style={{ color: THEME.goldLight, fontWeight: 600, fontSize: 16, letterSpacing: '0.5px' }}>BELA PRO</span>
            </div>
            <div style={{
              width: 32,
              height: 32,
              background: `linear-gradient(135deg, ${THEME.goldLight} 0%, ${THEME.gold} 100%)`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#1f1b17',
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
          </header>
        )}
        
        {children}
      </main>

      {/* CSS Global para responsividade */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        html {
          -webkit-text-size-adjust: 100%;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        /* Esconder scrollbar mas manter funcionalidade */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Ajustes para mobile */
        @media (max-width: 767px) {
          input, textarea, select, button {
            font-size: 16px !important; /* Evita zoom no iOS */
          }
        }
      `}</style>
    </div>
  );
}
