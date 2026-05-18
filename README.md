# autoflow-identity-service

> Microsserviço de **autenticação e autorização** do ecossistema **autoflow** (FIAP Tech Challenge — Fase 4).

Emite e valida tokens JWT para dois perfis:

- **Customer** (cliente final) — autentica via CPF + senha. CPF é resolvido contra o `order-service`, que mantém o cadastro completo do cliente.
- **Admin** (operador da oficina) — autentica via e-mail + senha contra o banco local.

Não armazena clientes — apenas administradores e a lógica de emissão de token.

---

## 🧱 Stack

| Camada       | Tecnologia                                |
|--------------|-------------------------------------------|
| Runtime      | Node.js 24 (LTS)                          |
| Linguagem    | TypeScript (strict)                       |
| Framework    | NestJS 11                                 |
| Banco        | PostgreSQL 16 (TypeORM + migrations)      |
| Autenticação | `@nestjs/jwt` (HS256) + bcrypt            |
| Resiliência  | opossum (circuit breaker p/ order-service)|
| Observ.      | New Relic APM + canonical logs (Winston)  |
| Testes       | Jest                                      |
| Container    | Docker multi-stage                        |
| Deploy       | EKS via GitHub Actions                    |

---

## 🏛️ Arquitetura

**MVC enxuto** (Controller → Service → Repository). Não usa hexagonal — a complexidade não justifica.

```
src/
├── auth/                      ← AuthController + AuthService (login + verify)
│   └── dto/
├── admin/                     ← entidade Admin + repo (autenticação local)
│   └── entities/
├── database/                  ← TypeORM datasource + migrations + seeds
│   ├── migrations/
│   └── seeds/
├── external/
│   └── order-service/         ← cliente HTTP (opossum CB) para resolver cliente por CPF
├── health/                    ← /health endpoint
└── shared/
    ├── config/                ← env validation
    ├── filters/               ← HttpExceptionFilter
    ├── guards/                ← JwtAuthGuard
    ├── logger/                ← CanonicalLogInterceptor + RequestContextService
    ├── middlewares/           ← correlation-id
    └── observability/         ← business-events (New Relic custom)
```

---

## 🌐 Endpoints REST

Roteados via Kong em `/auth/*`.

| Método | Path                  | Auth      | Descrição                                                |
|--------|-----------------------|-----------|----------------------------------------------------------|
| POST   | `/login/customer`     | público   | Login de cliente (CPF + senha) → JWT customer (1h)       |
| POST   | `/login/admin`        | público   | Login de admin (e-mail + senha) → JWT admin (8h)         |
| GET    | `/verify`             | JWT       | Valida o token e retorna o payload decodificado          |
| GET    | `/health`             | público   | Status do serviço + Postgres                             |

O `login/customer` chama o `order-service` via HTTP (`GET /customers/by-document/:cpf`) para validar a existência do CPF — circuit breaker (opossum) ativo: se a chamada falhar 50% das vezes em janela de 10s, abre o circuito.

---

## 📬 Eventos RabbitMQ

Nenhum — identity-service é puramente HTTP. Toda comunicação com outros serviços é síncrona via REST.

---

## 🔧 Variáveis de ambiente

| Variável                      | Default                                  | Descrição                            |
|-------------------------------|------------------------------------------|--------------------------------------|
| `PORT`                        | `3000`                                   | porta HTTP                            |
| `NODE_ENV`                    | `development`                            | ambiente                              |
| `DATABASE_URL`                | —                                        | conexão Postgres (admin db)           |
| `JWT_SECRET`                  | — (mínimo 32 caracteres)                 | segredo HS256                         |
| `JWT_CUSTOMER_EXPIRES_IN`     | `1h`                                     | TTL do token de cliente               |
| `JWT_ADMIN_EXPIRES_IN`        | `8h`                                     | TTL do token de admin                 |
| `ORDER_SERVICE_URL`           | `http://localhost:3001`                  | URL para resolver clientes            |
| `NEW_RELIC_LICENSE_KEY`       | —                                        | (opcional) APM                        |
| `NEW_RELIC_APP_NAME`          | `autoflow-identity-service`              |                                      |

---

## 🚀 Rodar localmente

```bash
# Postgres
docker run -d --name pg-identity -p 5432:5432 \
  -e POSTGRES_USER=identity_user -e POSTGRES_PASSWORD=identity_pass \
  -e POSTGRES_DB=identity postgres:16-alpine

npm install
cp .env.example .env       # ajuste JWT_SECRET + DATABASE_URL
npm run migration:run      # tabela admins
npm run start:dev
```

**Integração completa:** `cd ../autoflow-infra/local && ./bootstrap.sh` sobe kind + Postgres + 6 serviços + Kong.

---

## 🧪 Testes

```bash
npm run test           # unit
npm run test:cov       # threshold 80% global
npm run lint           # ESLint (TS strict)
```

> **TODO:** SonarQube Community Edition (self-hosted) — atualmente o gate é apenas o threshold do Jest.

---

## 🐳 Docker / ☸️ Deploy

| Workflow | Trigger                          | Jobs                              |
|----------|----------------------------------|-----------------------------------|
| `ci.yml` | push/PR em qualquer branch       | lint + test:cov                   |
| `cd.yml` | `workflow_run` (CI ok em `main`) | build & push image + rollout EKS  |

- Imagem: `kaikelfalcao/autoflow-identity:<sha>` no DockerHub.
- Cluster: `autoflow-dev-eks` / namespace `autoflow`. Manifests em `k8s/` (Deployment + Service + HPA + Secret).

Secrets via `scripts/sync-github-secrets.sh` do autoflow-infra: `DOCKER_USERNAME/PASSWORD`, `AWS_*`, `NEW_RELIC_LICENSE_KEY`.

---

## 📊 Observabilidade

- **Logs canônicos**: 1 entrada por request com `method`, `path`, `status_code`, `duration_ms`, `request_id` propagado pelo `x-correlation-id`.
- **PII sanitization**: o `OrderServiceClient` mascara CPF para `***.***.<últimos 4>` antes de qualquer log.
- **Custom events** (New Relic): `LoginSuccess`, `LoginFailure`, `OrderServiceCircuitOpen`.

---

## 🔗 Repositórios do ecossistema

[`autoflow-infra`](https://github.com/kaikelfalcao/autoflow-infra) · [`autoflow-order-service`](https://github.com/kaikelfalcao/autoflow-order-service) · [`autoflow-catalog-service`](https://github.com/kaikelfalcao/autoflow-catalog-service) · [`autoflow-payment-service`](https://github.com/kaikelfalcao/autoflow-payment-service) · [`autoflow-saga-orchestrator`](https://github.com/kaikelfalcao/autoflow-saga-orchestrator) · [`autoflow-notification-service`](https://github.com/kaikelfalcao/autoflow-notification-service)
