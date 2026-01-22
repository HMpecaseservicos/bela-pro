'use client';

import { useState, useRef } from 'react';
import { getImageUrl } from '@/lib/utils';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  category: 'logo' | 'cover' | 'gallery' | 'service';
  label?: string;
  hint?: string;
  aspectRatio?: 'square' | 'wide' | 'auto';
  previewHeight?: number;
}

export function ImageUpload({
  value,
  onChange,
  category,
  label,
  hint,
  aspectRatio = 'auto',
  previewHeight = 150,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  async function handleUpload(file: File) {
    // Validações no frontend
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não permitido. Use: JPG, PNG, GIF ou WebP');
      return;
    }

    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo: 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/upload/image?category=${category}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao fazer upload');
      }

      const data = await res.json();
      // Salvar URL relativa - será convertida na exibição
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
    }

    setUploading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleRemove() {
    onChange('');
  }

  const previewStyle: React.CSSProperties = {
    width: '100%',
    height: previewHeight,
    borderRadius: 12,
    overflow: 'hidden',
    border: '2px solid #e5e7eb',
    position: 'relative',
  };

  if (aspectRatio === 'square') {
    previewStyle.width = previewHeight;
    previewStyle.height = previewHeight;
  }

  return (
    <div>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 500,
          color: '#374151',
          fontSize: 14,
        }}>
          {label}
        </label>
      )}

      {/* Área de upload ou preview */}
      {value ? (
        <div style={previewStyle}>
          <img
            src={getImageUrl(value)}
            alt="Preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={e => {
              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect fill="%23f3f4f6" width="200" height="150"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle" dy=".3em" font-size="14">Erro ao carregar</text></svg>';
            }}
          />
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 8,
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Trocar
            </button>
            <button
              onClick={handleRemove}
              style={{
                background: 'rgba(239,68,68,0.9)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            ...previewStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? '#f0f9ff' : '#fafafa',
            borderStyle: 'dashed',
            borderColor: dragOver ? '#3b82f6' : '#d1d5db',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>
                Enviando...
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <span style={{ fontSize: 36, marginBottom: 8 }}>📷</span>
              <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                Clique ou arraste uma imagem
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                JPG, PNG, GIF ou WebP • Máx. 5MB
              </span>
            </>
          )}
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Campo de URL alternativo */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>ou cole uma URL</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://exemplo.com/imagem.jpg"
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Erro */}
      {error && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#dc2626' }}>
          ⚠️ {error}
        </p>
      )}

      {/* Dica */}
      {hint && !error && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9ca3af' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
