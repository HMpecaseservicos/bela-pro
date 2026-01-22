import { Workspace, ThemeConfig } from '../types';
import { SPACING, RADIUS } from '../constants';

interface HeroSectionProps {
  workspace: Workspace;
  theme: ThemeConfig;
}

export function HeroSection({ workspace, theme }: HeroSectionProps) {
  const { colors } = theme;
  const hasCover = !!workspace.coverImageUrl;
  const hasLogo = !!workspace.logoUrl;
  
  const brandName = workspace.brandName || workspace.name;
  const welcomeText = workspace.welcomeText || 'Agende seu horário';
  const description = workspace.description;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: hasCover ? 280 : 200,
        background: hasCover 
          ? `url(${workspace.coverImageUrl}) center/cover no-repeat`
          : colors.gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
        overflow: 'hidden',
      }}
    >
      {/* Overlay escuro para melhor legibilidade */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: hasCover 
            ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)'
            : 'rgba(0,0,0,0.1)',
          zIndex: 1,
        }}
      />

      {/* Conteúdo */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 400,
        }}
      >
        {/* Logo */}
        {hasLogo ? (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: RADIUS.full,
              overflow: 'hidden',
              marginBottom: SPACING.md,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: '3px solid rgba(255,255,255,0.9)',
              background: '#fff',
            }}
          >
            <img
              src={workspace.logoUrl!}
              alt={brandName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: RADIUS.full,
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: SPACING.md,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              fontSize: 32,
              fontWeight: 700,
              color: colors.primary,
            }}
          >
            {brandName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Nome do estabelecimento */}
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: '#FFFFFF',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            marginBottom: SPACING.xs,
          }}
        >
          {brandName}
        </h1>

        {/* Texto de boas-vindas */}
        <p
          style={{
            margin: 0,
            fontSize: 16,
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            marginBottom: description ? SPACING.sm : 0,
          }}
        >
          {welcomeText}
        </p>

        {/* Descrição (se houver) */}
        {description && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}

        {/* Endereço (se houver) */}
        {workspace.profile?.addressLine && (
          <div
            style={{
              marginTop: SPACING.md,
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.xs,
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <span>📍</span>
            <span>{workspace.profile.addressLine}</span>
          </div>
        )}
      </div>

      {/* Galeria preview (se houver) */}
      {workspace.galleryUrls && workspace.galleryUrls.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: SPACING.md,
            right: SPACING.md,
            display: 'flex',
            gap: SPACING.xs,
            zIndex: 2,
          }}
        >
          {workspace.galleryUrls.slice(0, 3).map((url, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.sm,
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.8)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <img
                src={url}
                alt={`Galeria ${i + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ))}
          {workspace.galleryUrls.length > 3 && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: RADIUS.sm,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#fff',
                fontWeight: 600,
              }}
            >
              +{workspace.galleryUrls.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
