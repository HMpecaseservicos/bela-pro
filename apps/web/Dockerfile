FROM node:22-bookworm-slim

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copia codigo para rodar sem bind mount (Windows drive nao compartilhado).
COPY prisma ./prisma/
COPY packages/shared ./packages/shared/
COPY apps/web ./apps/web/

WORKDIR /workspace/apps/web

EXPOSE 3000

# Build do Next.js
RUN npm run build

CMD ["npm", "run", "start"]
