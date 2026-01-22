'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Workspace {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: 'OWNER' | 'STAFF';
}

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWorkspaces();

    // Close dropdown on outside click
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchWorkspaces() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${apiUrl}/auth/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data: Workspace[] = await res.json();
        setWorkspaces(data);

        // Determine current workspace from token payload
        const currentWorkspaceId = localStorage.getItem('workspaceId');
        const current = data.find(w => w.workspaceId === currentWorkspaceId) || data[0];
        setCurrentWorkspace(current);
        
        if (current) {
          localStorage.setItem('workspaceName', current.workspaceName);
          localStorage.setItem('workspaceId', current.workspaceId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    }
  }

  async function switchWorkspace(workspace: Workspace) {
    if (workspace.workspaceId === currentWorkspace?.workspaceId) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(false);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const res = await fetch(`${apiUrl}/auth/switch-workspace`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ workspaceId: workspace.workspaceId }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Update token and localStorage
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('workspaceId', data.workspace.id);
        localStorage.setItem('workspaceName', data.workspace.name);
        
        setCurrentWorkspace(workspace);
        
        // Refresh the page to load new workspace data
        router.refresh();
        window.location.reload();
      } else {
        console.error('Failed to switch workspace');
      }
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setLoading(false);
    }
  }

  if (workspaces.length <= 1) {
    // Don't show switcher if only one workspace
    return (
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
        {currentWorkspace?.workspaceName || 'Agenda Digital'}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 11,
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          maxWidth: 130,
        }}>
          {loading ? 'Trocando...' : currentWorkspace?.workspaceName}
        </span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 8,
          background: '#2a2a4e',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          zIndex: 1000,
          minWidth: 180,
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
            Seus Workspaces
          </div>
          {workspaces.map((ws) => (
            <button
              key={ws.workspaceId}
              onClick={() => switchWorkspace(ws)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: ws.workspaceId === currentWorkspace?.workspaceId ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <span style={{ 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
              }}>
                {ws.workspaceName}
              </span>
              {ws.workspaceId === currentWorkspace?.workspaceId && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667eea">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
