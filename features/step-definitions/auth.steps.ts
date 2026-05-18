import { Given, Then, When } from '@cucumber/cucumber';
import { strict as assert } from 'node:assert';

import type { JwtPayload } from '../../src/auth/auth.service';
import type { AuthWorld } from '../support/world';

interface PendingAdmin {
  email: string;
  password: string;
}

declare module '../support/world' {
  interface AuthWorld {
    _pendingAdmin?: PendingAdmin;
  }
}

Given(
  /^existe um admin "([^"]+)" com senha "([^"]+)" (ativo|inativo)$/,
  async function (
    this: AuthWorld,
    email: string,
    password: string,
    state: string,
  ) {
    await this.seedAdmin(email, password, state === 'ativo');
    this._pendingAdmin = { email, password };
  },
);

Given(
  /^existe um cliente ativo no order-service com CPF "([^"]+)" e id "([^"]+)"$/,
  function (this: AuthWorld, cpf: string, id: string) {
    this.seedCustomer(cpf, id);
  },
);

Given(
  /^o order-service não tem cliente com CPF "([^"]+)"$/,
  function (this: AuthWorld, _cpf: string) {
    // intentionally empty — defaults
  },
);

When(
  /^ele faz login admin com a senha correta$/,
  async function (this: AuthWorld) {
    assert.ok(this._pendingAdmin, 'admin não foi semeado');
    try {
      const r = await this.service.loginAdmin({
        email: this._pendingAdmin.email,
        password: this._pendingAdmin.password,
      });
      this.lastToken = r.token;
      this.lastExpiresIn = r.expiresIn;
    } catch (err) {
      this.lastError = err as Error;
    }
  },
);

When(
  /^ele faz login admin com a senha "([^"]+)"$/,
  async function (this: AuthWorld, wrong: string) {
    assert.ok(this._pendingAdmin);
    try {
      const r = await this.service.loginAdmin({
        email: this._pendingAdmin.email,
        password: wrong,
      });
      this.lastToken = r.token;
    } catch (err) {
      this.lastError = err as Error;
    }
  },
);

When(
  /^o cliente faz login com CPF "([^"]+)"$/,
  async function (this: AuthWorld, cpf: string) {
    try {
      const r = await this.service.loginCustomer({ cpf });
      this.lastToken = r.token;
      this.lastExpiresIn = r.expiresIn;
    } catch (err) {
      this.lastError = err as Error;
    }
  },
);

Then(
  /^um token JWT é emitido com role "([^"]+)"$/,
  function (this: AuthWorld, expectedRole: string) {
    assert.ok(this.lastToken, this.lastError?.message ?? 'sem token');
    const decoded = this.service['jwt'].decode(this.lastToken) as JwtPayload;
    assert.equal(decoded.role, expectedRole);
  },
);

Then(/^o login admin é recusado$/, function (this: AuthWorld) {
  assert.ok(this.lastError, 'esperava erro no login admin');
  assert.equal(this.lastError.message, 'Credenciais inválidas');
});

Then(/^o login customer é recusado$/, function (this: AuthWorld) {
  assert.ok(this.lastError, 'esperava erro no login customer');
  assert.match(this.lastError.message, /Cliente/);
});

Then(/^o login customer é rejeitado por CPF inválido$/, function (this: AuthWorld) {
  assert.ok(this.lastError);
  assert.equal(this.lastError.message, 'CPF inválido');
});
