'use client';

import { useState, useRef } from 'react';
import { getImageUrl } from '@/lib/utils';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  category: 'logo' | 'cover' | 'gallery' | 'service';
  aspectRatio?: 'square' | 'wide' | 'auto';
  helpText?: string;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  category,
  aspectRatio = 'auto',
  helpText,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  async function handleUpload(file: File) {
    setError('');
    setUploading(true);

    try {
      // Valida tamanho
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo: 5MB');
      }

      // Valida tipo
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        throw new Error('Use imagens JPG, PNG, GIF ou WebP');
      }

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
        throw new Error(data.message || 'Erro no upload');
      }

      const data = await res.json();
      // Salvar URL relativa - será convertida na exibição
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'Erro no upload');
    }

    setUploading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleRemove() {
    onChange('');
  }

  const previewHeight = aspectRatio === 'square' ? 120 : aspectRatio === 'wide' ? 100 : 120;
  const previewWidth = aspectRatio === 'square' ? 120 : aspectRatio === 'wide' ? '100%' : 120;

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#374151', fontSize: 14 }}>
        {label}
      </label>

      {value ? (
        // Preview da imagem
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div
            style={{
              width: previewWidth,
              height: previewHeight,
              borderRadius: 12,
              overflow: 'hidden',
              border: '2px solid #e5e7eb',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <img
              src={getImageUrl(value)}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => (e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="%23f3f4f6" width="120" height="120"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle" dy=".3em" font-size="12">Erro</text></svg>')}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              📷 Trocar
            </button>
            <button
              onClick={handleRemove}
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              🗑️ Remover
            </button>
          </div>
        </div>
      ) : (
        // Área de upload
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${dragOver ? '#667eea' : '#d1d5db'}`,
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? '#f0f4ff' : '#fafafa',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? (
            <>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '4px solid #e5e7eb',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>Enviando...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
              <p style={{ margin: '0 0 4px', color: '#374151', fontWeight: 500, fontSize: 14 }}>
                Clique para selecionar ou arraste
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
                JPG, PNG, GIF ou WebP (máx. 5MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {error && (
        <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: 13 }}>❌ {error}</p>
      )}

      {helpText && !error && (
        <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 12 }}>{helpText}</p>
      )}
    </div>
  );
}
