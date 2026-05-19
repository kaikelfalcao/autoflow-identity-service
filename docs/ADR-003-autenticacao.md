# ADR-003 — JWT stateless + verificação cruzada para cliente

## Contexto

Dois tipos de usuário com fluxos diferentes:
- **Admin**: cadastrado no banco do identity-service.
- **Cliente**: cadastrado no `order-service` (entidade `customer`).

Precisamos autenticar ambos sem duplicar o cadastro de cliente.

## Decisão

- Admin: bcrypt no banco local, JWT com `role: 'ADMIN'`, expira em 8h.
- Cliente: identity-service **não** persiste cliente. No login, chama
  `GET /customers/by-document/:cpf` no order-service para validar existência
  + estado ativo. Se existir, emite JWT com `role: 'CUSTOMER'` e
  `sub = customer.id`. Expira em 1h.

JWT é stateless — `/auth/verify` apenas valida assinatura, sem consultar DB.

## Consequências

**+** Sem duplicação de dados de cliente.
**+** Revogação requer encurtar TTL (sem revocation list) — aceitável para o
caso de uso.
**−** Acoplamento síncrono identity → order durante o login (cliente).
  Mitigação: timeout curto + fallback explícito (401 "cliente não encontrado").
