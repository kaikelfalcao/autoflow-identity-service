import { setWorldConstructor, World } from '@cucumber/cucumber';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import type { AdminService } from '../../src/admin/admin.service';
import { AuthService } from '../../src/auth/auth.service';
import type { OrderServiceClient } from '../../src/external/order-service/order-service.client';
import { RequestContextService } from '../../src/shared/logger/request-context.service';

interface FakeAdmin {
  id: string;
  email: string;
  passwordHash: string;
  active: boolean;
}

interface FakeCustomer {
  id: string;
  documentNumber: string;
  active: boolean;
}

class FakeAdminService {
  admins: FakeAdmin[] = [];

  async findByEmail(email: string): Promise<FakeAdmin | null> {
    return this.admins.find((a) => a.email === email) ?? null;
  }
}

class FakeOrderClient {
  customers: FakeCustomer[] = [];

  async findCustomerByDocument(doc: string): Promise<FakeCustomer | null> {
    return this.customers.find((c) => c.documentNumber === doc) ?? null;
  }
}

const config = {
  getOrThrow: (k: string): string => {
    if (k === 'JWT_CUSTOMER_EXPIRES_IN') return '1h';
    if (k === 'JWT_ADMIN_EXPIRES_IN') return '8h';
    throw new Error(`missing ${k}`);
  },
  get: () => undefined,
} as unknown as ConfigService;

export class AuthWorld extends World {
  adminService = new FakeAdminService();
  orderClient = new FakeOrderClient();
  jwt = new JwtService({ secret: 'ci-test-secret-32chars-minimo-aqui-ok!!' });
  requestCtx = new RequestContextService();
  service = new AuthService(
    this.adminService as unknown as AdminService,
    this.orderClient as unknown as OrderServiceClient,
    this.jwt,
    this.requestCtx,
    config,
  );

  lastToken: string | null = null;
  lastExpiresIn: number | null = null;
  lastError: Error | null = null;

  async seedAdmin(email: string, password: string, active: boolean): Promise<void> {
    this.adminService.admins.push({
      id: `admin-${email}`,
      email,
      passwordHash: await bcrypt.hash(password, 4),
      active,
    });
  }

  seedCustomer(doc: string, id: string): void {
    this.orderClient.customers.push({
      id,
      documentNumber: doc,
      active: true,
    });
  }

  constructor(opts: ConstructorParameters<typeof World>[0]) {
    super(opts);
    this.requestCtx.enter({});
  }
}

setWorldConstructor(AuthWorld);
