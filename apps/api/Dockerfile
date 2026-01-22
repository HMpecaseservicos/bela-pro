FROM node:22-bookworm-slim

WORKDIR /workspace

# Ferramentas para builds nativos (fallback). Mantemos slim + toolchain mínimo.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# Copia manifests para melhor cache (quando usado sem bind mount)
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Instala deps (se existir lock). Em dev via bind mount, o comando no compose garante.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copia codigo para rodar sem bind mount (Windows drive nao compartilhado).
COPY prisma ./prisma/
COPY packages/shared ./packages/shared/
COPY apps/api ./apps/api/

# Gera Prisma Client antes do build
RUN npx prisma generate --schema=./prisma/schema.prisma

WORKDIR /workspace/apps/api

EXPOSE 3001

# Build da aplicacao para prod
RUN npm run build

CMD ["npm", "run", "start"]
