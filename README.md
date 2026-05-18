# identity-service

Microsserviço de autenticação e emissão de JWT.

## Arquitetura

MVC simples: Controller → Service → Repository.

- `auth/` — login Customer (via CPF) e Admin (email/senha), verify token
- `admin/` — entidade Admin e repositório
- `external/order-service/` — HTTP client para validar CPF no `autoflow-order-service`
- `shared/` — middlewares, filters, guards, logger, config
- `health/` — liveness + dependências
- `database/` — migrations e seed

## Executar

```bash
docker compose up -d postgres
npm install
npm run migration:run
npm run seed:admin
npm run start:dev
```

Swagger em `http://localhost:3000/api/docs` (apenas em desenvolvimento).

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/login/customer` | público | Login via CPF (consulta order-service) |
| POST | `/auth/login/admin` | público | Login via email/senha |
| GET | `/auth/verify` | Bearer | Verifica token (usado pelo Kong) |
| GET | `/health` | público | Liveness + checa Postgres e order-service |

## Retry no order-service

4 tentativas: timeouts 2s → 4s → 10s → 30s, delays 0 → 500ms → 1s → 2s.
Após esgotar → 503 `OrderServiceUnavailableError`.

## Testes

```bash
npm test              # unit
npm run test:cov      # coverage (≥ 80%)
```

## Variáveis de ambiente

Ver `.env.example`. Obrigatórias:
- `DATABASE_URL`
- `JWT_SECRET` (mínimo 32 caracteres)
- `JWT_CUSTOMER_EXPIRES_IN`, `JWT_ADMIN_EXPIRES_IN`
- `ORDER_SERVICE_URL`, `ORDER_SERVICE_TIMEOUT_MS`
