# Infra

Pasta para infraestrutura local e produção.

- `docker-compose.yml` na raiz: Postgres + Redis (dev)
- Evolução: Kubernetes / Fly.io / Render / AWS

Recomendação de produção:
- Postgres gerenciado
- Redis gerenciado (ou Upstash)
- Object storage (se futuramente houver fotos/arquivos)
