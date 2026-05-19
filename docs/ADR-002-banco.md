# ADR-002 — Postgres + TypeORM

## Contexto

Persistência de admins exige integridade referencial e queries simples por
email. JWTs não são persistidos (stateless).

## Decisão

- Postgres 16
- TypeORM (mesmo padrão do `order-service`, `saga-orchestrator` e `payment-service`)
- Migrations versionadas em `src/database/migrations/`
- Senhas em bcrypt (cost 10)

## Consequências

**+** Padrão idêntico ao resto do ecossistema reduz curva.
**+** Migrations versionadas dão histórico de schema.
**−** TypeORM com globs precisa de `__dirname` para resolver em runtime
(corrigido — ver datasource.ts). Não usar globs com paths `src/**/*.ts`
porque o container roda `dist/**/*.js`.
