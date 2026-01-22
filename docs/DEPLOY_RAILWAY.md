# 🚀 Deploy no Railway

Este guia mostra como fazer deploy do Bela Pro no Railway.

## Pré-requisitos

1. Conta no [Railway](https://railway.app) (login com GitHub)
2. Projeto no GitHub

## Passo 1: Subir projeto para o GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/bela-pro.git
git push -u origin main
```

## Passo 2: Criar projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Autorize o Railway a acessar seu GitHub
5. Selecione o repositório **bela-pro**

## Passo 3: Adicionar PostgreSQL

1. No projeto Railway, clique em **"+ New"**
2. Selecione **"Database"** → **"PostgreSQL"**
3. Aguarde o banco ser criado

## Passo 4: Configurar a API

1. Clique em **"+ New"** → **"GitHub Repo"**
2. Selecione seu repo novamente
3. Na aba **Settings**:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm run build`
   - **Start Command**: `npx prisma migrate deploy --schema=../../prisma/schema.prisma && node dist/main.js`

4. Na aba **Variables**, adicione:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_ACCESS_SECRET=sua-chave-secreta-super-forte-aqui-123
JWT_REFRESH_SECRET=outra-chave-secreta-super-forte-456
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=2592000
API_PORT=3001
PUBLIC_BASE_URL=https://seu-frontend.railway.app
```

## Passo 5: Configurar o Frontend (Web)

1. Clique em **"+ New"** → **"GitHub Repo"**
2. Selecione seu repo novamente
3. Na aba **Settings**:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

4. Na aba **Variables**, adicione:

```
NEXT_PUBLIC_API_URL=https://sua-api.railway.app/api/v1
```

## Passo 6: Gerar domínios públicos

1. Em cada serviço (API e Web), vá em **Settings**
2. Clique em **"Generate Domain"**
3. Copie as URLs geradas

## Passo 7: Atualizar variáveis

Atualize as variáveis com os domínios corretos:

- Na **API**: `PUBLIC_BASE_URL` = URL do frontend
- No **Web**: `NEXT_PUBLIC_API_URL` = URL da API + `/api/v1`

## 📱 Pronto!

Agora você pode acessar:
- **Frontend**: `https://seu-frontend.railway.app`
- **API**: `https://sua-api.railway.app`

E testar no celular! 🎉

---

## Alternativa: Vercel (Frontend) + Railway (API + DB)

Se preferir o Vercel para o frontend (melhor performance para Next.js):

### Frontend no Vercel:
1. Acesse [vercel.com](https://vercel.com)
2. Importe o repositório
3. Configure Root Directory: `apps/web`
4. Adicione variável: `NEXT_PUBLIC_API_URL`

### API + DB no Railway:
Siga os passos 2-4 acima.

---

## Troubleshooting

### Erro de Prisma
Se der erro de Prisma, adicione ao build command:
```
npx prisma generate --schema=../../prisma/schema.prisma && npm run build
```

### Erro de porta
Railway define a porta automaticamente via `PORT`. Certifique-se que o main.ts usa:
```typescript
const port = process.env.API_PORT || process.env.PORT || 3001;
```
