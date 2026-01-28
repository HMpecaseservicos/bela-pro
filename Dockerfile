# =============================================================================
# BELA PRO - Dockerfile para Fly.io
# Base: Node.js 20 LTS (Debian Bookworm) + Chromium sistema
# Multi-stage build para imagem otimizada
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Build
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci --no-audit --no-fund

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npm run db:generate

# Build da API
RUN npm run build -w @bela-pro/api

# -----------------------------------------------------------------------------
# STAGE 2: Production
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS production

# Variáveis de ambiente para Puppeteer/Chromium
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WHATSAPP_SESSIONS_DIR=/data/whatsapp

# Instalar Chromium e todas as libs necessárias para Puppeteer headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    ca-certificates \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    libdrm2 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcups2 \
    libatspi2.0-0 \
    libxshmfence1 \
    libglu1-mesa \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && chromium --version

# Criar usuário não-root para segurança
RUN groupadd -r bela && useradd -r -g bela -G audio,video bela \
    && mkdir -p /home/bela /app /data/whatsapp \
    && chown -R bela:bela /home/bela /app /data

WORKDIR /app

# Copiar dependências de produção
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/

# Instalar apenas dependências de produção
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar artefatos do build
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar schema prisma para migrations
COPY prisma ./prisma

# Ajustar permissões
RUN chown -R bela:bela /app

# Trocar para usuário não-root
USER bela

# Expor porta (Fly.io usa 8080 por padrão)
EXPOSE 8080

# Usar dumb-init para gerenciar processos corretamente
ENTRYPOINT ["dumb-init", "--"]

# Comando de start: roda migrations e inicia a API
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node apps/api/dist/main.js"]
