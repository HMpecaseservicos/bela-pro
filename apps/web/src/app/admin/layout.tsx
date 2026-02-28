'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const MENU_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/workspaces', label: 'Empresas', icon: '🏢' },
  { href: '/admin/users', label: 'Usuários', icon: '👥' },
  { href: '/admin/plans', label: 'Planos', icon: '📋' },
  { href: '/admin/subscriptions', label: 'Assinaturas', icon: '💳' },
  { href: '/admin/billing', label: 'Billing', icon: '💰' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  // Fechar sidebar ao mudar de rota
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevenir scroll quando sidebar aberta no mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  async function checkSuperAdmin() {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!data.isSuperAdmin) {
        router.push('/dashboard');
        return;
      }

      setIsSuperAdmin(true);
      setUserName(data.name || 'Super Admin');
    } catch (err) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    router.push('/login');
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
      }}>
        <div style={{
          width: 50,
          height: 50,
          border: '4px solid #334155',
          borderTopColor: '#f59e0b',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #0f172a;
        }
        
        /* Mobile Header */
        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          z-index: 40;
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
        }
        
        .menu-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 24px;
          cursor: pointer;
          border-radius: 8px;
        }
        
        .menu-btn:active {
          background: #334155;
        }
        
        /* Overlay */
        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 45;
          backdrop-filter: blur(4px);
        }
        
        .sidebar-overlay.open {
          display: block;
        }
        
        /* Sidebar */
        .sidebar {
          width: 260px;
          background: #1e293b;
          border-right: 1px solid #334155;
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          transition: transform 0.3s ease;
        }
        
        /* Main content */
        .main-content {
          flex: 1;
          margin-left: 260px;
          padding: 32px;
          min-height: 100vh;
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
          
          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }
          
          .main-content {
            margin-left: 0;
            padding: 76px 16px 24px;
          }
        }
        
        /* Tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar {
            width: 220px;
          }
          .main-content {
            margin-left: 220px;
            padding: 24px;
          }
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15 }}>Super Admin</span>
        </div>
        <div style={{ width: 44 }} />
      </header>

      {/* Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              ⚙️
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 16 }}>BELA PRO</div>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 500 }}>Super Admin</div>
            </div>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'none',
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              background: '#334155',
              border: 'none',
              borderRadius: 8,
              color: '#94a3b8',
              fontSize: 18,
              cursor: 'pointer',
            }}
            className="close-sidebar-btn"
          >
            ✕
          </button>
          <style>{`
            @media (max-width: 768px) {
              .close-sidebar-btn { display: flex !important; }
            }
          `}</style>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {MENU_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 10,
                  marginBottom: 4,
                  background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: isActive ? '#f59e0b' : '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: 15,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #334155',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 16,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#f8fafc', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Administrador</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10,
              color: '#ef4444',
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            🚪 Sair
          </button>
          
          {/* Link para voltar ao Dashboard normal */}
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 8,
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 10,
              color: '#3b82f6',
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
