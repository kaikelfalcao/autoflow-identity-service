# ADR-001 — Arquitetura em camadas (não Hexagonal)

## Contexto

O `identity-service` é majoritariamente CRUD: cadastrar admin, autenticar
admin/cliente, emitir JWT. Não tem invariantes de domínio complexos.

## Decisão

Não aplicar Hexagonal/Clean Architecture. Estrutura em camadas direta do
NestJS:

```
src/
├── admin/       # CRUD de administradores
├── auth/        # login + JWT
├── external/    # cliente HTTP para order-service
├── database/    # migrations, seeds
└── shared/      # config, logger, middlewares
```

Cada feature tem `controller + service + entity`, sem ports/adapters.

## Consequências

**+** Onboarding rápido — qualquer dev NestJS reconhece a estrutura.
**+** Menos arquivos vs catalog/order/payment.
**−** Trocar Postgres por outro DB exigiria refactor maior. Aceitável: é
o serviço com menor complexidade de domínio, troca improvável.
