'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { NotificationToggle } from '@/components/NotificationToggle';

const THEME = {
  gold: '#a07a45',
  goldSoft: '#c9a66b',
  page: '#f4f1ec',
  surface: '#fbf8f3',
  sidebar: 'linear-gradient(180deg, #6a5846 0%, #544230 56%, #443528 100%)',
  sidebarText: '#f1e7d9',
  textPrimary: '#2f2a24',
  borderSubtle: '#e4dbcf',
};

const menuItems = [
  { href: '/dashboard', label: 'Visao do Negocio', exact: true },
  { href: '/dashboard/agenda', label: 'Agenda' },
  { href: '/dashboard/clientes', label: 'Clientes' },
  { href: '/dashboard/servicos', label: 'Servicos' },
  { href: '/dashboard/financeiro', label: 'Financeiro' },
  { href: '/dashboard/horarios', label: 'Horarios' },
  { href: '/dashboard/equipe', label: 'Equipe' },
  { href: '/dashboard/aparencia', label: 'Aparencia' },
  { href: '/dashboard/config', label: 'Configuracoes' },
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

    const checkMobile = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: THEME.page }}>
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(44, 33, 21, 0.46)',
            backdropFilter: 'blur(2px)',
            zIndex: 99,
          }}
        />
      )}

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
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
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
          {menuItems.map((item) => {
            const active = isActive(item.href, item.exact);
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
                  <span style={{ color: active ? '#f5d7a4' : 'rgba(246, 237, 225, 0.42)' }}>o</span>
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

      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 272,
          minHeight: '100vh',
          background: THEME.page,
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
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                border: `1px solid ${THEME.borderSubtle}`,
                borderRadius: 10,
                background: '#fff',
                padding: '8px 10px',
                color: THEME.textPrimary,
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="font-display" style={{ fontSize: 20, color: THEME.gold, lineHeight: 1 }}>BELA</div>

            <div
              style={{
                width: 30,
                height: 30,
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
          </header>
        )}

        {children}
      </main>
    </div>
  );
}
